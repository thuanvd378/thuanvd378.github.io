# Mojo CNN GPU 🚀

<div align="center">

![Mojo CNN GPU](https://img.shields.io/badge/Mojo%20CNN-GPU%20Acceleration-76b900?style=for-the-badge&logo=nvidia)
![C++](https://img.shields.io/badge/C++-17-blue?style=for-the-badge&logo=c%2B%2B)
![CUDA](https://img.shields.io/badge/CUDA-12.x-green?style=for-the-badge&logo=nvidia)

**A high-performance, lightweight C++ Convolutional Neural Network framework accelerated by CUDA & cuDNN.**

[Introduction](#introduction) • [Features](#key-features) • [Architecture](#overall-architecture) • [Getting Started](#installation) • [Documentation](#running-the-project)

</div>

---

## Introduction

**Mojo CNN GPU** is a modernized evolution of the original header-only Mojo CNN library. While the original library focused on portability and CPU performance using OpenMP, this fork introduces a dedicated, high-performance GPU backend leveraging **NVIDIA CUDA** and **cuDNN**.

Designed for developers who need the simplicity of a C++ API but demand the training speed of modern deep learning frameworks. It maintains the "easy-to-use" philosophy of the original while unlocking the massive parallel processing power of GPUs.

## Key Features

- **🚀 GPU Acceleration**: Fully implemented CUDA/cuDNN backend for lightning-fast training and inference.
- **⚡ Lightweight**: Minimal dependencies. No heavy framework installation required—just C++, CUDA, and cuDNN.
- **🛠️ Flexible API**: Define complex network architectures (Conv2D, Pooling, FC, Dropout) with a simple, string-based configuration or fluent C++ API.
- **🔄 Hybrid Architecture**: Retains the original CPU-only `mojo` namespace for legacy support while offering the high-performance `mojo-gpu` namespace for modern workloads.
- **📊 Real-time Monitoring**: Built-in console progress bars and accuracy tracking.

## Overall Architecture

The project is structured into two distinct execution backends. The **Legacy CPU** path remains header-only and portable. The **New GPU** path (architected by `thuanvd378`) introduces a separate, optimized pipeline.

```mermaid
graph TD
    subgraph "Application Layer"
        UserApp["User Application (main.cpp)"]
    end

    subgraph "Mojo Framework"
        direction TB
        
        Config[Network Configuration]
        
        subgraph "CPU Backend (Legacy)"
            MojoCPU[mojo::network]
            LayersCPU["CPU Layers (OpenMP)"]
            SolverCPU[CPU Solvers]
        end
        
        subgraph "GPU Backend (New)"
            MojoGPU["mojo::Network (GPU)"]
            LayersGPU[cuDNN Layers]
            SolverGPU["CUDA Optimizers (Adam/SGD)"]
            MemMan[Unified Memory Management]
        end
    end

    subgraph "Hardware Abstraction"
        OpenMP[OpenMP Multi-threading]
        CUDA[CUDA Toolkit]
        cuDNN[NVIDIA cuDNN Library]
    end

    UserApp --> Config
    Config --> |namespace mojo| MojoCPU
    Config --> |namespace mojo-gpu| MojoGPU
    
    MojoCPU --> LayersCPU
    LayersCPU --> OpenMP
    
    MojoGPU --> LayersGPU
    MojoGPU --> SolverGPU
    LayersGPU --> cuDNN
    SolverGPU --> CUDA
    MemMan --> CUDA
```

### Directory Structure

| Directory | Description |
|-----------|-------------|
| `mojo/` | **Legacy**: The original header-only CPU implementation. Dependencies: OpenMP. |
| `mojo-gpu/` | **New**: The GPU-accelerated implementation. Contains `.cuh` files for CUDA kernels and cuDNN wrappers. |
| `examples/` | Sample applications demonstrating `train_mnist_cpu` and `train_mnist_gpu`. |
| `data/` | Directory for datasets (MNIST, CIFAR). |

## Installation

### Prerequisites

Ensure you have the following installed on your Windows machine:

1.  **Visual Studio 2019/2022** (with C++ Desktop Development workload).
2.  **NVIDIA CUDA Toolkit** (v11.x or newer).
3.  **NVIDIA cuDNN** (compatible with your CUDA version).

### Setup Environment

You need to set the `CUDNN_PATH` environment variable to point to your cuDNN installation.

```cmd
setx CUDNN_PATH "C:\path\to\your\cudnn"
```
*Alternatively, you can edit `build_gpu.bat` directly if you prefer not to set global variables.*

## Running the Project

The project comes with ready-to-use batch scripts for building examples.

### 1. Build GPU Version (Recommended)

Open the **x64 Native Tools Command Prompt for VS 2019/2022** and run:

```cmd
.\build_gpu.bat
```

This will compile `examples/train_mnist_gpu.cpp` and produce `examples/train_mnist_gpu.exe`.

### 2. Build CPU Version

```cmd
.\build_cpu.bat
```

### 3. Run the Training

After building, run the executable:

```cmd
cd examples
train_mnist_gpu.exe
```

**Output:**
```
======================================
  MOJO CNN - GPU (cuDNN) Version
======================================
[Config] Batch size: 64
[Config] Learning rate: 0.01

Epoch 1
  [GPU] training: [====================] 100%
  mini batch:       64
  training time:    1.2s seconds on GPU (cuDNN)
  test accuracy:    98.5%
```

## Folder Structure

```
mojo-cnn-gpu/
├── mojo/               # CPU Implementation (Headers)
├── mojo-gpu/           # GPU Implementation (CUDA/C++)
│   ├── mojo.h          # Main entry point
│   ├── layers.cuh      # Layer implementations
│   └── ...
├── examples/           # Example Source Code
│   ├── train_mnist.cpp # CPU Example
│   └── train_mnist_gpu.cpp # GPU Example
├── data/               # Dataset storage
├── build_gpu.bat       # GPU Build Script
├── build_cpu.bat       # CPU Build Script
└── README.md           # Documentation
```

## Contribution Guidelines

We welcome contributions! Please follow these steps:

1.  **Fork** the repository.
2.  Create a feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes (`git commit -m 'Add some amazing feature'`).
4.  Push to the branch (`git push origin feature/amazing-feature`).
5.  Open a **Pull Request**.

PLEASE NOTE: When modifying `mojo-gpu`, ensure you maintain strict memory management practices (freeing CUDA resources) and run benchmarks to verify performance improvements.

## License

This project is licensed under the MIT License - see the [license.txt](license.txt) file for details.

Original `mojo-cnn` by **gnawice**.
GPU Architecture & Port by **thuanvd378**.

## Roadmap

- [x] Full MNIST Training on GPU
- [x] cuDNN Integration (Conv, Pool, Activation)
- [ ] Support for Loading/Saving GPU Models
- [ ] Multi-GPU Support
- [ ] CIFAR-10 Example for GPU

---

<p align="center">
  ദ്ദി ˉ͈̀꒳ˉ͈́ )✧
</p>
