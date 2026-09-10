import os
import csv
import io
import json
import uuid
import hashlib
import threading
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, Tuple, List
from db import get_db, calculate_audit_hash, GENESIS_HASH

ALLOWED_DISPOSITIONS = {
    "CONFIRMED": [
        "VERIFIED_VIOLATION",
        "ACTIVE_INTRUSION",
        "RULE_BREACH_CONFIRMED",
        "RESTRICTED_AIRSPACE_BREACH"
    ],
    "DISMISSED": [
        "AUTHORIZED_AFTER_REVIEW",
        "FALSE_POSITIVE",
        "DUPLICATE_ALERT",
        "SENSOR_ERROR",
        "NATURAL_WILDLIFE_CONFIRMED"
    ],
    "ESCALATED": [
        "SAFETY_RISK",
        "CRITICAL_ZONE_BREACH",
        "REQUIRES_COMMAND_REVIEW",
        "GROUND_PATROL_DISPATCHED"
    ]
}

class AuditService:
    def __init__(self):
        self._lock = threading.Lock()

    def get_latest_hash(self) -> str:
        with self._lock:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT current_hash FROM audit_logs ORDER BY id DESC LIMIT 1")
            row = cursor.fetchone()
            conn.close()
            if row and row["current_hash"]:
                return row["current_hash"]
            return GENESIS_HASH

    def log_event(self, operator_id: str, operator_role: str, action: str,
                  resource_type: str, resource_id: str, result: str = "SUCCESS",
                  reason_code: str = "OFFICER_ACTION", details: str = "") -> Dict[str, Any]:
        """
        Appends an immutable, tamper-evident audit record to the cryptographic hash chain.
        Thread-safe under concurrent logging.
        """
        with self._lock:
            conn = get_db()
            cursor = conn.cursor()

            # Get previous hash
            cursor.execute("SELECT current_hash FROM audit_logs ORDER BY id DESC LIMIT 1")
            last_row = cursor.fetchone()
            previous_hash = last_row["current_hash"] if last_row and last_row["current_hash"] else GENESIS_HASH

            audit_id = f"AUDIT-{uuid.uuid4().hex[:12].upper()}"
            timestamp = datetime.now(timezone.utc).isoformat()

            current_hash = calculate_audit_hash(
                timestamp=timestamp,
                operator_id=operator_id,
                action=action,
                resource_id=resource_id,
                result=result,
                reason_code=reason_code,
                details=details,
                previous_hash=previous_hash
            )

            cursor.execute("""
                INSERT INTO audit_logs (
                    audit_id, timestamp, operator_id, user_name, operator_role, action,
                    resource_type, resource, resource_id, result, reason_code, details,
                    previous_hash, current_hash
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                audit_id, timestamp, operator_id, operator_id, operator_role, action,
                resource_type, resource_id, resource_id, result, reason_code, details,
                previous_hash, current_hash
            ))
            conn.commit()
            conn.close()

            return {
                "audit_id": audit_id,
                "timestamp": timestamp,
                "operator_id": operator_id,
                "action": action,
                "resource_id": resource_id,
                "result": result,
                "reason_code": reason_code,
                "previous_hash": previous_hash,
                "current_hash": current_hash
            }

    def verify_chain(self) -> Dict[str, Any]:
        """
        Traverses the full audit ledger from genesis/checkpoint to latest record,
        verifying the cryptographic integrity of every link.
        """
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, audit_id, timestamp, operator_id, action, resource_id,
                   result, reason_code, details, previous_hash, current_hash
            FROM audit_logs
            ORDER BY id ASC
        """)
        records = cursor.fetchall()

        if not records:
            conn.close()
            return {
                "valid": True,
                "status": "CHAIN VALID",
                "checked_records": 0,
                "records_verified": 0,
                "broken_at": None,
                "genesis_hash": GENESIS_HASH,
                "latest_hash": GENESIS_HASH,
                "message": "Audit ledger is clean and initialized."
            }

        # Check authenticated start: either GENESIS_HASH or verified checkpoint
        first_rec = records[0]
        cursor.execute("SELECT checkpoint_hash FROM audit_checkpoints WHERE checkpoint_hash = ?", (first_rec["previous_hash"],))
        chk = cursor.fetchone()
        conn.close()

        is_valid_start = (first_rec["previous_hash"] == GENESIS_HASH) or (chk is not None)
        if not is_valid_start:
            return {
                "valid": False,
                "status": "TAMPER DETECTED",
                "checked_records": 0,
                "records_verified": 0,
                "broken_at": first_rec["id"],
                "failed_record_id": first_rec["id"],
                "failed_audit_id": first_rec["audit_id"],
                "error": f"Genesis break at record #{first_rec['id']}: previous_hash '{first_rec['previous_hash'][:16]}...' is neither genesis nor authenticated checkpoint."
            }

        expected_prev = first_rec["previous_hash"]
        for idx, rec in enumerate(records):
            # Check link to previous hash
            if rec["previous_hash"] != expected_prev:
                return {
                    "valid": False,
                    "status": "TAMPER DETECTED",
                    "checked_records": idx,
                    "records_verified": idx,
                    "broken_at": rec["id"],
                    "failed_record_id": rec["id"],
                    "failed_audit_id": rec["audit_id"],
                    "error": f"Previous hash mismatch at record #{rec['id']} ({rec['audit_id']}). Expected {expected_prev[:16]}..., found {rec['previous_hash'][:16]}..."
                }

            # Check recalculation of current hash
            recomputed = calculate_audit_hash(
                timestamp=rec["timestamp"],
                operator_id=rec["operator_id"] or "SYSTEM",
                action=rec["action"],
                resource_id=rec["resource_id"] or "SYSTEM",
                result=rec["result"] or "SUCCESS",
                reason_code=rec["reason_code"] or "",
                details=rec["details"] or "",
                previous_hash=rec["previous_hash"]
            )

            if rec["current_hash"] != recomputed:
                return {
                    "valid": False,
                    "status": "TAMPER DETECTED",
                    "checked_records": idx,
                    "records_verified": idx,
                    "broken_at": rec["id"],
                    "failed_record_id": rec["id"],
                    "failed_audit_id": rec["audit_id"],
                    "error": f"Cryptographic tamper detected at record #{rec['id']} ({rec['audit_id']}). Recomputed hash does not match stored hash!"
                }

            expected_prev = rec["current_hash"]

        return {
            "valid": True,
            "status": "CHAIN VALID",
            "checked_records": len(records),
            "records_verified": len(records),
            "broken_at": None,
            "genesis_hash": GENESIS_HASH[:16] + "...",
            "latest_hash": records[-1]["current_hash"],
            "message": f"Cryptographic integrity verified across {len(records)} audit ledger records."
        }

    def record_alert_disposition(self, alert_id: str, disposition: str, reason_code: str,
                                 operator_id: str, operator_role: str, notes: str = "") -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Enforces mandatory reason code disposition for an alert:
        DISPOSITION in ['CONFIRMED', 'DISMISSED', 'ESCALATED']
        """
        disp_upper = disposition.upper()
        if disp_upper not in ALLOWED_DISPOSITIONS:
            return False, f"Invalid disposition '{disposition}'. Must be one of: {list(ALLOWED_DISPOSITIONS.keys())}", None

        allowed_reasons = ALLOWED_DISPOSITIONS[disp_upper]
        if reason_code not in allowed_reasons:
            return False, f"Invalid reason code '{reason_code}' for disposition '{disp_upper}'. Allowed codes: {allowed_reasons}", None

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM alerts WHERE alert_id = ?", (alert_id,))
        alt = cursor.fetchone()
        if not alt:
            conn.close()
            return False, f"Alert '{alert_id}' not found.", None

        now_str = datetime.now(timezone.utc).isoformat()
        new_status = "RESOLVED" if disp_upper in ["CONFIRMED", "DISMISSED"] else "ESCALATED"

        cursor.execute("""
            UPDATE alerts
            SET status = ?,
                disposition = ?,
                disposition_reason = ?,
                disposition_notes = ?,
                disposition_by = ?,
                disposition_at = ?
            WHERE alert_id = ?
        """, (new_status, disp_upper, reason_code, notes, operator_id, now_str, alert_id))
        conn.commit()
        conn.close()

        # Log to audit ledger with cryptographic SHA-256 hash chaining
        action_name = f"ALERT_DISPOSITION_{disp_upper}"
        audit_res = self.log_event(
            operator_id=operator_id,
            operator_role=operator_role,
            action=action_name,
            resource_type="ALERT",
            resource_id=alert_id,
            result="SUCCESS",
            reason_code=reason_code,
            details=f"Disposition: {disp_upper} | Code: {reason_code} | Notes: {notes}"
        )

        # Record in dedicated alert_dispositions table and incidents if escalated
        conn2 = get_db()
        cur2 = conn2.cursor()
        try:
            cur2.execute("""
                INSERT INTO alert_dispositions 
                (alert_id, disposition, reason_code, notes, operator_id, operator_role, audit_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (alert_id, disp_upper, reason_code, notes, operator_id, operator_role, audit_res.get("audit_id")))
        except Exception:
            pass

        # If escalated, open an incident record
        if disp_upper == "ESCALATED":
            inc_id = f"INC-ESC-{uuid.uuid4().hex[:6].upper()}"
            try:
                cur2.execute("""
                    INSERT INTO incidents (incident_id, track_id, incident_type, severity, location_name, latitude, longitude, status, assigned_officer, summary, notes)
                    VALUES (?, ?, ?, ?, 'Command Sector', ?, ?, 'OPEN', ?, ?, ?)
                """, (
                    inc_id,
                    alt["track_id"],
                    alt["alert_type"],
                    alt["severity"],
                    alt["latitude"],
                    alt["longitude"],
                    operator_id,
                    f"Escalated Alert: {alt['title']} ({reason_code})",
                    notes
                ))
            except Exception:
                pass

        conn2.commit()
        conn2.close()

        return True, f"Disposition '{disp_upper}' successfully committed to audit ledger.", audit_res

    def export_csv(self) -> str:
        """
        Generates genuine CSV export of the full tamper-evident audit ledger.
        """
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, audit_id, timestamp, operator_id, operator_role, action,
                   resource_type, resource_id, result, reason_code, details,
                   previous_hash, current_hash
            FROM audit_logs
            ORDER BY id ASC
        """)
        rows = cursor.fetchall()
        conn.close()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Audit ID", "Timestamp (UTC)", "Operator", "Role", "Action",
            "Resource Type", "Resource ID", "Result", "Reason Code", "Details",
            "Previous SHA256 Hash", "Current SHA256 Hash"
        ])

        for r in rows:
            writer.writerow([
                r["audit_id"],
                r["timestamp"],
                r["operator_id"],
                r["operator_role"],
                r["action"],
                r["resource_type"],
                r["resource_id"],
                r["result"],
                r["reason_code"],
                r["details"],
                r["previous_hash"],
                r["current_hash"]
            ])

        return output.getvalue()

    def export_json(self) -> str:
        """
        Generates genuine JSON export of the full tamper-evident audit ledger.
        """
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, audit_id, timestamp, operator_id, operator_role, action,
                   resource_type, resource_id, result, reason_code, details,
                   previous_hash, current_hash
            FROM audit_logs
            ORDER BY id ASC
        """)
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()

        return json.dumps({
            "export_metadata": {
                "system": "AeroGuard Civil Law Enforcement Surveillance Console",
                "ledger_type": "TAMPER_EVIDENT_AUDIT_LEDGER",
                "exported_at": datetime.now(timezone.utc).isoformat(),
                "total_records": len(rows),
                "genesis_hash": GENESIS_HASH
            },
            "records": rows
        }, indent=2)

    def purge_expired_records(self, operator_id: str, operator_role: str, retention_days: Optional[int] = None) -> Dict[str, Any]:
        """
        Executes safe retention cleanup based on retention_days.
        Archives expired records and establishes a valid chain checkpoint so chain integrity is preserved.
        """
        conn = get_db()
        cursor = conn.cursor()

        if retention_days is None:
            cursor.execute("SELECT value FROM system_settings WHERE key = 'audit_retention_days'")
            setting_row = cursor.fetchone()
            retention_days = int(setting_row["value"]) if setting_row else 365

        cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_days)
        cutoff_str = cutoff_date.isoformat()

        cursor.execute("SELECT * FROM audit_logs WHERE timestamp < ? ORDER BY id ASC", (cutoff_str,))
        rows_to_archive = cursor.fetchall()
        count_to_purge = len(rows_to_archive)

        checkpoint_hash = None
        if count_to_purge > 0:
            # 1. Archive expired records
            for r in rows_to_archive:
                cursor.execute("""
                    INSERT OR REPLACE INTO audit_logs_archive 
                    (id, audit_id, timestamp, operator_id, operator_role, action, resource_type, resource_id, result, reason_code, details, previous_hash, current_hash)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    r["id"], r["audit_id"], r["timestamp"], r["operator_id"], r["operator_role"],
                    r["action"], r["resource_type"], r["resource_id"], r["result"], r["reason_code"],
                    r["details"], r["previous_hash"], r["current_hash"]
                ))

            # 2. Identify the first record that will remain after purge and checkpoint its previous hash
            cursor.execute("SELECT id, previous_hash FROM audit_logs WHERE timestamp >= ? ORDER BY id ASC LIMIT 1", (cutoff_str,))
            first_remaining = cursor.fetchone()
            if first_remaining:
                checkpoint_hash = first_remaining["previous_hash"]
                cursor.execute("""
                    INSERT OR REPLACE INTO audit_checkpoints (checkpoint_id, checkpoint_hash, record_id, notes)
                    VALUES (?, ?, ?, ?)
                """, (f"CHK-{int(time.time())}", checkpoint_hash, first_remaining["id"], f"Retention checkpoint for cutoff {cutoff_str}"))

            # 3. Delete from active audit_logs
            cursor.execute("DELETE FROM audit_logs WHERE timestamp < ?", (cutoff_str,))
            conn.commit()

        conn.close()

        # 4. Log the purge event in active ledger
        audit_res = self.log_event(
            operator_id=operator_id,
            operator_role=operator_role,
            action="AUDIT_LEDGER_PURGE",
            resource_type="AUDIT_SYSTEM",
            resource_id="RETENTION_JOB",
            result="SUCCESS",
            reason_code="SCHEDULED_RETENTION_EXPIRY",
            details=f"Purged {count_to_purge} audit records older than {retention_days} days (Cutoff: {cutoff_str}, Checkpoint: {checkpoint_hash or 'NONE'})."
        )

        # 5. Record run in audit_retention_runs
        try:
            c = get_db()
            cur = c.cursor()
            cur.execute("""
                INSERT INTO audit_retention_runs 
                (retention_days, records_purged, checkpoint_hash, operator_id, audit_id)
                VALUES (?, ?, ?, ?, ?)
            """, (retention_days, count_to_purge, checkpoint_hash, operator_id, audit_res.get("audit_id")))
            c.commit()
            c.close()
        except Exception:
            pass

        return {
            "success": True,
            "records_purged": count_to_purge,
            "retention_days": retention_days,
            "cutoff_timestamp": cutoff_str,
            "checkpoint_hash": checkpoint_hash,
            "audit_entry": audit_res
        }

audit_service = AuditService()
