# EMNIST Recogniser — Google Colab Training Notebook
# =====================================================
# Copy each cell block into a separate Colab cell.
# Runtime: GPU (T4) recommended — Runtime → Change runtime type → GPU
#
# Expected training time: ~25–35 minutes for 30 epochs on T4
# Expected val accuracy:  ≥ 88% on EMNIST Balanced

# ╔══════════════════════════════════════════════════════════════╗
# ║  CELL 1 — Check GPU & install deps                          ║
# ╚══════════════════════════════════════════════════════════════╝

import subprocess, sys

result = subprocess.run(["nvidia-smi"], capture_output=True, text=True)
print(result.stdout if result.returncode == 0 else "⚠️  No GPU detected — switch runtime to GPU!")

# Torch is pre-installed on Colab; torchvision too.
# Only need to verify versions:
import torch, torchvision
print(f"PyTorch   : {torch.__version__}")
print(f"Torchvision: {torchvision.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")


# ╔══════════════════════════════════════════════════════════════╗
# ║  CELL 2 — Upload model.py and train.py                      ║
# ╚══════════════════════════════════════════════════════════════╝

from google.colab import files as colab_files
import os

print("Upload backend/model.py and backend/train.py from your local machine.")
print("Select BOTH files when the dialog opens.\n")
uploaded = colab_files.upload()

for fname in uploaded:
    print(f"  ✓ Uploaded: {fname} ({len(uploaded[fname]):,} bytes)")

assert "model.py" in uploaded, "model.py not found — please upload it!"
assert "train.py" in uploaded, "train.py not found — please upload it!"
print("\nReady to train. Proceed to Cell 3.")


# ╔══════════════════════════════════════════════════════════════╗
# ║  CELL 3 — Download EMNIST & train (30 epochs)               ║
# ╚══════════════════════════════════════════════════════════════╝

# This will:
# 1. Download EMNIST Balanced (~500 MB, cached after first run)
# 2. Train for 30 epochs with OneCycleLR
# 3. Save best model to ./emnist_net.pth
# 4. Print final test accuracy

os.system("python train.py --epochs 30 --batch-size 256 --lr 1e-3 --output-dir .")


# ╔══════════════════════════════════════════════════════════════╗
# ║  CELL 4 — Quick sanity check                                ║
# ╚══════════════════════════════════════════════════════════════╝

import torch
import torch.nn.functional as F
from torchvision import datasets, transforms
import numpy as np

# Verify the saved model loads and produces sensible output
from model import EMNISTNet, EMNIST_LABELS, NUM_CLASSES

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

model = EMNISTNet(num_classes=NUM_CLASSES)
state = torch.load("emnist_net.pth", map_location=device)
model.load_state_dict(state)
model.to(device)
model.eval()
print("✓ Model loaded successfully")
print(f"  Parameters: {sum(p.numel() for p in model.parameters()):,}")

# Run on 5 random test samples
test_ds = datasets.EMNIST(
    root="./data",
    split="balanced",
    train=False,
    download=True,
    transform=transforms.Compose([
        transforms.RandomHorizontalFlip(p=1.0),
        transforms.Lambda(lambda img: img.rotate(90)),
        transforms.ToTensor(),
        transforms.Normalize((0.1307,), (0.3081,)),
    ])
)

print("\nSample predictions:")
for i in range(5):
    img, label_idx = test_ds[i * 200]
    with torch.no_grad():
        logits = model(img.unsqueeze(0).to(device))
        probs  = F.softmax(logits, dim=1)[0]
        pred   = probs.argmax().item()
        conf   = probs[pred].item() * 100
    true_label = EMNIST_LABELS[label_idx]
    pred_label = EMNIST_LABELS[pred]
    status = "✓" if pred == label_idx else "✗"
    print(f"  {status} True: {true_label:>2} | Pred: {pred_label:>2} ({conf:.1f}%)")


# ╔══════════════════════════════════════════════════════════════╗
# ║  CELL 5 — Download the trained model                        ║
# ╚══════════════════════════════════════════════════════════════╝

import os
assert os.path.exists("emnist_net.pth"), "Model file not found — did training complete?"
size_mb = os.path.getsize("emnist_net.pth") / 1024 / 1024
print(f"Model size: {size_mb:.1f} MB")
print("Downloading emnist_net.pth to your computer…")

colab_files.download("emnist_net.pth")

print("\n✓ Done! Place emnist_net.pth in the backend/ folder before running the API.")


# ╔══════════════════════════════════════════════════════════════╗
# ║  CELL 6 — (Optional) Resume training from checkpoint        ║
# ╚══════════════════════════════════════════════════════════════╝

# If your Colab session disconnected mid-training:
#   os.system("python train.py --resume --epochs 30 --batch-size 256 --lr 1e-3")
#
# The checkpoint is saved to ./emnist_checkpoint.pth automatically each epoch.
