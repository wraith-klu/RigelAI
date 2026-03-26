from fastai.text.all import load_learner
import os

def predict_code_smell(code: str, model_path: str):
    """
    Loads FastAI model and predicts code smell category.
    Returns structured metrics:
    - smell_type: predicted class
    - confidence: probability of predicted class
    - all_probs: probabilities for all classes
    """
    if not os.path.exists(model_path):
        return {"error": f"⚠️ Model file not found: {model_path}"}

    try:
        learner = load_learner(model_path)
        pred, pred_idx, probs = learner.predict(code)
        return {
            "smell_type": str(pred),
            "confidence": float(probs[pred_idx]),
            "all_probs": {str(c): float(p) for c, p in zip(learner.dls.vocab, probs)}
        }
    except Exception as e:
        return {"error": f"⚠️ Model prediction failed: {e}"}
