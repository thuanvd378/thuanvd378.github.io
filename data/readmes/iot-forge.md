# IoT-Forge 🐝

![License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)
![Python Version](https://img.shields.io/badge/python-3.9%2B-blue?style=for-the-badge&logo=python)
![Status](https://img.shields.io/badge/status-active-success.svg?style=for-the-badge)

**Declarative, High-Concurrency IoT Device Simulation for Infrastructure Load Testing.**

Traditional IoT mockers simulate one device at a time or require writing custom scripts. **IoT-Forge** uses a declarative YAML schema to orchestrate thousands of virtual devices via `asyncio`, pumping realistic time-series data over MQTT, HTTP, or Kafka.

Built for DevOps, QA, and IoT Architects who need to test system resilience, validate data pipelines, or benchmark message brokers before deploying physical hardware.

---

## 🎯 Key Features

- **Declarative Infrastructure-as-Code (IaC):** Define your entire device fleet, payloads, and protocols in a single YAML file.
- **High Concurrency:** Powered by Python `asyncio`. Simulate 10,000+ devices on a single machine.
- **Realistic Data Generation:** Supports mathematical models (Random Walk, Gaussian Noise, Sine Waves) to prevent data pipelines from over-optimizing static mock data.
- **Multi-Protocol Publishers:** Built-in support for MQTT, HTTP REST, and stdout. Easily extensible to Kafka or AMQP.

## 🚀 Quick Start

### 1. Installation

```bash
git clone https://github.com/thuanvd378/iot-forge.git
cd iot-forge
pip install -r requirements.txt
```

### 2. Define Your Fleet (`smart_factory.yaml`)

```yaml
fleet:
  name: "Factory_Floor_A"
  instances: 500
  protocol:
    type: "mqtt"
    broker: "mqtt://localhost:1883"
    topic_pattern: "factory/devices/{device_id}/telemetry"
  interval_ms: 1000
  sensors:
    - name: "temperature"
      type: "random_walk"
      start: 25.0
      step: 0.5
      min: -10.0
      max: 100.0
    - name: "status"
      type: "categorical"
      values: ["OK", "OK", "WARNING", "ERROR"]
```

### 3. Launch the Forge

```bash
python -m src.cli --config examples/smart_factory.yaml --workers 4
```

## 📂 Architecture

IoT-Forge follows a strict modular design:
- `engine/`: Manages the async event loop and connection pooling.
- `generators/`: Mathematical models for data synthesis.
- `publishers/`: Network adapters for different protocols.

> For a deep dive, see [Architecture Documentation](./docs/architecture.md).

## 🤝 Contributing

We welcome pull requests! Please ensure your code adheres to PEP-8 and includes appropriate `pytest` coverage.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
