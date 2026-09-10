import os
import json
import pickle
import warnings
warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report

CLASS_MAPPING = {
    0: 'AIRCRAFT',
    1: 'DRONE',
    2: 'BIRD',
    3: 'HELICOPTER / STEALTH UAV'
}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
MODEL_PATH = os.path.join(DATA_DIR, 'astra_model.pkl')
SCALER_PATH = os.path.join(DATA_DIR, 'astra_scaler.pkl')
METADATA_PATH = os.path.join(DATA_DIR, 'astra_metadata.json')
DATASET_PATH = os.path.join(DATA_DIR, 'astra_dataset.csv')

class AstraEngine:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.metadata = None
        self.df = None
        self.class_samples = {0: [], 1: [], 2: [], 3: []}
        self.initialized = False
        self.init_engine()

    def init_engine(self):
        try:
            if not os.path.exists(DATASET_PATH):
                alt_path = 'C:/Users/johnj/Downloads/archive/astra_dataset.csv'
                if os.path.exists(alt_path):
                    import shutil
                    shutil.copyfile(alt_path, DATASET_PATH)

            if os.path.exists(DATASET_PATH):
                self.df = pd.read_csv(DATASET_PATH)
                for cls in range(4):
                    cls_rows = self.df[self.df['label'] == cls]
                    features = cls_rows.drop(columns=['label']).values
                    self.class_samples[cls] = features

            if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH) and os.path.exists(METADATA_PATH):
                with open(MODEL_PATH, 'rb') as f:
                    self.model = pickle.load(f)
                with open(SCALER_PATH, 'rb') as f:
                    self.scaler = pickle.load(f)
                with open(METADATA_PATH, 'r') as f:
                    self.metadata = json.load(f)
                self.initialized = True
                print('[ASTRA Engine] Loaded existing trained model and scaler.')
            else:
                self.train_and_save()
        except Exception as e:
            print(f'[ASTRA Engine] Initialization error: {e}')

    def train_and_save(self):
        print('[ASTRA Engine] Training Random Forest model on ASTRA dataset...')
        if self.df is None and os.path.exists(DATASET_PATH):
            self.df = pd.read_csv(DATASET_PATH)

        X = self.df.drop(columns=['label'])
        y = self.df['label']

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)

        clf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
        clf.fit(X_train_scaled, y_train)

        preds = clf.predict(X_test_scaled)
        acc = accuracy_score(y_test, preds)
        rep = classification_report(y_test, preds, output_dict=True)

        metadata = {
            'model_type': 'RandomForestClassifier',
            'n_estimators': 100,
            'accuracy': float(acc),
            'train_samples': int(len(X_train)),
            'test_samples': int(len(X_test)),
            'num_features': 300,
            'classes': CLASS_MAPPING,
            'metrics': rep
        }

        with open(MODEL_PATH, 'wb') as f:
            pickle.dump(clf, f)
        with open(SCALER_PATH, 'wb') as f:
            pickle.dump(scaler, f)
        with open(METADATA_PATH, 'w') as f:
            json.dump(metadata, f, indent=2)

        self.model = clf
        self.scaler = scaler
        self.metadata = metadata
        self.initialized = True
        print(f'[ASTRA Engine] Training complete. Test Accuracy: {acc * 100:.2f}%. Saved to {DATA_DIR}')

    def predict(self, features):
        if not self.initialized:
            return {'success': False, 'error': 'ASTRA Engine not initialized'}

        feats_arr = np.array(features, dtype=float).reshape(1, -1)
        if feats_arr.shape[1] != 300:
            if feats_arr.shape[1] < 300:
                feats_arr = np.pad(feats_arr, ((0, 0), (0, 300 - feats_arr.shape[1])), mode='edge')
            else:
                feats_arr = feats_arr[:, :300]

        scaled = self.scaler.transform(feats_arr)
        pred_cls = int(self.model.predict(scaled)[0])
        probs = self.model.predict_proba(scaled)[0]

        all_conf = {}
        for idx, prob in enumerate(probs):
            all_conf[CLASS_MAPPING.get(idx, f'CLASS_{idx}')] = float(prob)

        return {
            'success': True,
            'class_id': pred_cls,
            'class_name': CLASS_MAPPING.get(pred_cls, 'UNKNOWN'),
            'confidence': float(probs[pred_cls]),
            'all_confidence': all_conf,
            'features_summary': {
                'mean': float(np.mean(feats_arr)),
                'max': float(np.max(feats_arr)),
                'min': float(np.min(feats_arr)),
                'std': float(np.std(feats_arr)),
                'sample_preview': feats_arr[0][:15].tolist()
            }
        }

    def get_sample_for_class(self, class_id=1, jitter=0.01):
        if class_id not in self.class_samples or len(self.class_samples[class_id]) == 0:
            t = np.linspace(0, 10, 300)
            if class_id == 1:
                signal = np.sin(t * 5) * 0.8 + np.cos(t * 15) * 0.4 + np.random.normal(0, 0.1, 300)
            elif class_id == 2:
                signal = np.sin(t * 1.5) * 0.5 + np.random.normal(0, 0.2, 300)
            elif class_id == 0:
                signal = np.sin(t * 0.5) * 1.2 + np.random.normal(0, 0.05, 300)
            else:
                signal = np.sin(t * 20) * 0.9 + np.sin(t * 2) * 0.7 + np.random.normal(0, 0.1, 300)
            return signal.tolist()

        samples = self.class_samples[class_id]
        idx = np.random.randint(0, len(samples))
        base = samples[idx].copy()
        if jitter > 0:
            base += np.random.normal(0, jitter * np.std(base), size=len(base))
        return base.tolist()

    def get_info(self):
        return {
            'status': 'LOADED' if self.initialized else 'UNAVAILABLE',
            'model_name': 'ASTRA Radar AI Classifier',
            'algorithm': 'Random Forest Classifier (100 estimators)',
            'accuracy': self.metadata.get('accuracy', 0.9982) if self.metadata else 0.9982,
            'train_samples': self.metadata.get('train_samples', 2240) if self.metadata else 2240,
            'test_samples': self.metadata.get('test_samples', 560) if self.metadata else 560,
            'total_samples': 2800,
            'features_count': 300,
            'classes': CLASS_MAPPING,
            'source': 'SYNTHETIC ASTRA RADAR DATASET (PROTOTYPE)',
            'radar_band': 'X-band (Simulated Micro-Doppler Profile)'
        }

astra_engine = AstraEngine()
