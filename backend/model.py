"""
EMNIST Balanced CNN Model
Architecture: Deep CNN with BatchNorm + Dropout for 47-class recognition.
Input:  (B, 1, 28, 28) — greyscale, normalised
Output: (B, 47) — raw logits
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


# ── EMNIST Balanced label mapping ──────────────────────────────────────────
# 47 classes: 0-9 digits, A-Z uppercase, a-z lowercase (with confusable
# letters merged: C/c, I/i/1, J/j, K/k, L/l, M/m, O/o/0, P/p, S/s/5,
# U/u, V/v, W/w, X/x, Y/y, Z/z — EMNIST Balanced keeps 47 distinct)
EMNIST_LABELS = (
    [str(i) for i in range(10)]                     # 0–9
    + [chr(i) for i in range(ord("A"), ord("Z") + 1)]  # A–Z
    + [chr(i) for i in range(ord("a"), ord("z") + 1)]  # a–z (47 in balanced)
)[:47]

NUM_CLASSES = 47


class ResidualBlock(nn.Module):
    """A lightweight residual block for feature reuse."""

    def __init__(self, channels: int, dropout: float = 0.1):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(channels, channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(channels),
            nn.GELU(),
            nn.Dropout2d(dropout),
            nn.Conv2d(channels, channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(channels),
        )
        self.act = nn.GELU()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.act(x + self.block(x))


class EMNISTNet(nn.Module):
    """
    CNN for EMNIST Balanced (47 classes).

    Architecture:
        Stem  → 32 ch
        Stage 1 → 64 ch  + ResBlock
        Stage 2 → 128 ch + ResBlock
        Stage 3 → 256 ch + ResBlock
        GAP → FC(256→256) → FC(256→47)

    Targets ≥ 88 % validation accuracy on EMNIST Balanced.
    """

    def __init__(self, num_classes: int = NUM_CLASSES, dropout: float = 0.4):
        super().__init__()

        # Stem
        self.stem = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(32),
            nn.GELU(),
        )

        # Stage 1: 28×28 → 14×14
        self.stage1 = nn.Sequential(
            nn.Conv2d(32, 64, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(64),
            nn.GELU(),
            ResidualBlock(64, dropout=0.1),
            nn.MaxPool2d(2),
        )

        # Stage 2: 14×14 → 7×7
        self.stage2 = nn.Sequential(
            nn.Conv2d(64, 128, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(128),
            nn.GELU(),
            ResidualBlock(128, dropout=0.1),
            nn.MaxPool2d(2),
        )

        # Stage 3: 7×7 → 3×3
        self.stage3 = nn.Sequential(
            nn.Conv2d(128, 256, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(256),
            nn.GELU(),
            ResidualBlock(256, dropout=0.1),
            nn.MaxPool2d(2),
        )

        # Classifier head
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(256, 256),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(256, num_classes),
        )

        self._init_weights()

    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, mode="fan_out", nonlinearity="relu")
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.ones_(m.weight)
                nn.init.zeros_(m.bias)
            elif isinstance(m, nn.Linear):
                nn.init.trunc_normal_(m.weight, std=0.02)
                if m.bias is not None:
                    nn.init.zeros_(m.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.stem(x)
        x = self.stage1(x)
        x = self.stage2(x)
        x = self.stage3(x)
        x = self.pool(x)
        return self.classifier(x)


def load_model(weights_path: str, device: torch.device) -> EMNISTNet:
    """Load a trained EMNISTNet from a .pth checkpoint."""
    model = EMNISTNet(num_classes=NUM_CLASSES)
    state = torch.load(weights_path, map_location=device)
    # Support both raw state_dict and {'model': state_dict, ...} checkpoints
    if "model" in state:
        state = state["model"]
    model.load_state_dict(state)
    model.to(device)
    model.eval()
    return model
