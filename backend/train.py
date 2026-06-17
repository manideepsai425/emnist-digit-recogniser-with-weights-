"""
EMNIST Balanced Training Script
================================
Designed to run on Google Colab (free tier or Pro).
After training, download emnist_net.pth and place it in the backend/ folder.

Usage (Colab):
    !python train.py --epochs 30 --batch-size 256 --lr 1e-3

Local:
    python train.py --epochs 30 --batch-size 128

The script will save:
    emnist_net.pth          — best model weights (for deployment)
    emnist_checkpoint.pth   — full checkpoint (resume training)
"""

import argparse
import os
import time
from pathlib import Path

import torch
import torch.nn as nn
import torch.optim as optim
from torch.optim.lr_scheduler import OneCycleLR
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, transforms

# ── Local import (same directory) ─────────────────────────────────────────
from model import EMNISTNet, NUM_CLASSES


# ──────────────────────────────────────────────────────────────────────────
# EMNIST Balanced statistics (precomputed)
MEAN = 0.1307
STD  = 0.3081


def get_transforms(augment: bool = True):
    """
    EMNIST images are transposed relative to MNIST.
    We apply a mandatory horizontal flip + transpose to fix orientation,
    then optionally add augmentation.
    """
    base = [
        # Fix EMNIST orientation (images stored column-major)
        transforms.RandomHorizontalFlip(p=1.0),
        transforms.RandomVerticalFlip(p=0.0),   # no-op, keeps the pipeline explicit
        transforms.Lambda(lambda img: img.rotate(90)),  # transpose fix
        transforms.ToTensor(),
        transforms.Normalize((MEAN,), (STD,)),
    ]

    aug = [
        transforms.RandomAffine(
            degrees=10,
            translate=(0.1, 0.1),
            scale=(0.9, 1.1),
            shear=5,
        ),
        transforms.RandomErasing(p=0.2, scale=(0.02, 0.1)),
    ] if augment else []

    # Insert augmentation before ToTensor
    if augment:
        pipeline = [
            transforms.RandomHorizontalFlip(p=1.0),
            transforms.Lambda(lambda img: img.rotate(90)),
            transforms.RandomAffine(
                degrees=10,
                translate=(0.1, 0.1),
                scale=(0.9, 1.1),
                shear=5,
            ),
            transforms.ToTensor(),
            transforms.Normalize((MEAN,), (STD,)),
            transforms.RandomErasing(p=0.2, scale=(0.02, 0.1)),
        ]
    else:
        pipeline = [
            transforms.RandomHorizontalFlip(p=1.0),
            transforms.Lambda(lambda img: img.rotate(90)),
            transforms.ToTensor(),
            transforms.Normalize((MEAN,), (STD,)),
        ]

    return transforms.Compose(pipeline)


def get_dataloaders(data_dir: str, batch_size: int, val_split: float = 0.1):
    train_ds = datasets.EMNIST(
        root=data_dir,
        split="balanced",
        train=True,
        download=True,
        transform=get_transforms(augment=True),
    )
    test_ds = datasets.EMNIST(
        root=data_dir,
        split="balanced",
        train=False,
        download=True,
        transform=get_transforms(augment=False),
    )

    # Split train into train/val
    n_val = int(len(train_ds) * val_split)
    n_train = len(train_ds) - n_val
    train_ds, val_ds = random_split(
        train_ds, [n_train, n_val],
        generator=torch.Generator().manual_seed(42)
    )
    # Val uses no augmentation
    val_ds.dataset.transform = get_transforms(augment=False)

    train_loader = DataLoader(
        train_ds, batch_size=batch_size,
        shuffle=True, num_workers=2, pin_memory=True
    )
    val_loader = DataLoader(
        val_ds, batch_size=batch_size * 2,
        shuffle=False, num_workers=2, pin_memory=True
    )
    test_loader = DataLoader(
        test_ds, batch_size=batch_size * 2,
        shuffle=False, num_workers=2, pin_memory=True
    )

    return train_loader, val_loader, test_loader


# ──────────────────────────────────────────────────────────────────────────

def train_one_epoch(model, loader, criterion, optimiser, scheduler, device, epoch):
    model.train()
    total_loss, correct, total = 0.0, 0, 0
    for i, (imgs, labels) in enumerate(loader):
        imgs, labels = imgs.to(device), labels.to(device)
        optimiser.zero_grad(set_to_none=True)
        logits = model(imgs)
        loss = criterion(logits, labels)
        loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimiser.step()
        scheduler.step()

        total_loss += loss.item() * imgs.size(0)
        correct     += (logits.argmax(1) == labels).sum().item()
        total       += imgs.size(0)

        if (i + 1) % 100 == 0:
            print(
                f"  Epoch {epoch} | Step {i+1}/{len(loader)} "
                f"| Loss {total_loss/total:.4f} | Acc {correct/total*100:.2f}%"
            )

    return total_loss / total, correct / total


@torch.no_grad()
def evaluate(model, loader, criterion, device):
    model.eval()
    total_loss, correct, total = 0.0, 0, 0
    for imgs, labels in loader:
        imgs, labels = imgs.to(device), labels.to(device)
        logits = model(imgs)
        loss   = criterion(logits, labels)
        total_loss += loss.item() * imgs.size(0)
        correct     += (logits.argmax(1) == labels).sum().item()
        total       += imgs.size(0)
    return total_loss / total, correct / total


# ──────────────────────────────────────────────────────────────────────────

def main(args):
    device = torch.device(
        "cuda" if torch.cuda.is_available()
        else "mps"  if torch.backends.mps.is_available()
        else "cpu"
    )
    print(f"Device: {device}")

    # ── Data ──────────────────────────────────────────────────────────────
    print("Loading EMNIST Balanced…")
    train_loader, val_loader, test_loader = get_dataloaders(
        args.data_dir, args.batch_size
    )
    print(
        f"  Train: {len(train_loader.dataset):,} | "
        f"Val: {len(val_loader.dataset):,} | "
        f"Test: {len(test_loader.dataset):,}"
    )

    # ── Model ─────────────────────────────────────────────────────────────
    model = EMNISTNet(num_classes=NUM_CLASSES, dropout=0.4).to(device)
    n_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"Parameters: {n_params:,}")

    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimiser = optim.AdamW(
        model.parameters(), lr=args.lr, weight_decay=1e-4
    )
    scheduler = OneCycleLR(
        optimiser,
        max_lr=args.lr,
        steps_per_epoch=len(train_loader),
        epochs=args.epochs,
        pct_start=0.1,
    )

    # ── Resume ────────────────────────────────────────────────────────────
    start_epoch, best_val_acc = 1, 0.0
    ckpt_path = Path(args.output_dir) / "emnist_checkpoint.pth"
    if args.resume and ckpt_path.exists():
        ckpt = torch.load(ckpt_path, map_location=device)
        model.load_state_dict(ckpt["model"])
        optimiser.load_state_dict(ckpt["optimiser"])
        start_epoch   = ckpt["epoch"] + 1
        best_val_acc  = ckpt["best_val_acc"]
        print(f"Resumed from epoch {start_epoch - 1} (best val acc {best_val_acc*100:.2f}%)")

    Path(args.output_dir).mkdir(parents=True, exist_ok=True)
    best_model_path = Path(args.output_dir) / "emnist_net.pth"

    # ── Training loop ─────────────────────────────────────────────────────
    for epoch in range(start_epoch, args.epochs + 1):
        t0 = time.time()
        train_loss, train_acc = train_one_epoch(
            model, train_loader, criterion, optimiser, scheduler, device, epoch
        )
        val_loss, val_acc = evaluate(model, val_loader, criterion, device)
        elapsed = time.time() - t0

        print(
            f"Epoch {epoch:>3}/{args.epochs} | "
            f"Train Loss {train_loss:.4f} Acc {train_acc*100:.2f}% | "
            f"Val Loss {val_loss:.4f} Acc {val_acc*100:.2f}% | "
            f"{elapsed:.1f}s"
        )

        # Save best
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), best_model_path)
            print(f"  ✓ New best — saved to {best_model_path}")

        # Save checkpoint for resuming
        torch.save({
            "epoch":        epoch,
            "model":        model.state_dict(),
            "optimiser":    optimiser.state_dict(),
            "best_val_acc": best_val_acc,
        }, ckpt_path)

    # ── Final test evaluation ──────────────────────────────────────────────
    model.load_state_dict(torch.load(best_model_path, map_location=device))
    test_loss, test_acc = evaluate(model, test_loader, criterion, device)
    print(f"\nTest Accuracy: {test_acc*100:.2f}%  (target ≥ 88%)")
    print(f"Best model saved: {best_model_path}")

    # ── Colab download helper ──────────────────────────────────────────────
    try:
        from google.colab import files  # type: ignore
        print("\nDownloading model from Colab…")
        files.download(str(best_model_path))
    except ImportError:
        print(f"\nNot running in Colab — model at: {best_model_path}")


# ──────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train EMNISTNet")
    parser.add_argument("--epochs",     type=int,   default=30)
    parser.add_argument("--batch-size", type=int,   default=256)
    parser.add_argument("--lr",         type=float, default=1e-3)
    parser.add_argument("--data-dir",   type=str,   default="./data")
    parser.add_argument("--output-dir", type=str,   default=".")
    parser.add_argument("--resume",     action="store_true")
    args = parser.parse_args()
    main(args)
