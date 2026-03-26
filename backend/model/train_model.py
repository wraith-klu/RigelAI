from fastai.text.all import *
import pandas as pd
import pathlib
pathlib.PosixPath = pathlib.WindowsPath 

def train_fastai_model():
    print("🚀 Loading dataset...")

    # Load dataset safely
    df = pd.read_csv("code_smells.csv", encoding="utf-8-sig")
    df.columns = df.columns.str.strip()  
    print("📊 Columns:", df.columns.tolist())
    print(df.head())

    if "code" not in df.columns or "label" not in df.columns:
        raise ValueError("❌ CSV must contain 'code' and 'label' columns.")

    # Define Text DataBlock correctly
    dblock = DataBlock(
        blocks=(TextBlock.from_df('code', is_lm=False), CategoryBlock),
        get_x=ColReader('text'),  
        get_y=ColReader('label'),
        splitter=RandomSplitter(0.2)
    )


    dls = dblock.dataloaders(df, bs=4)

    print("🧠 Training model...")
    learn = text_classifier_learner(dls, AWD_LSTM, metrics=accuracy)
    learn.fine_tune(3)

    print("💾 Saving model...")
    learn.export("export.pkl")
    print("✅ Model trained and saved as 'export.pkl'!")

if __name__ == "__main__":
    train_fastai_model()
