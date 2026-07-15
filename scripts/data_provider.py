#!/usr/bin/env python3
"""data_provider.py — provides benchmark data for the report."""
import json, os

def get_benchmark_data():
    """Return benchmark results as Python objects. Does NOT use str() internally."""
    d = None
    with open(os.path.join(os.path.dirname(__file__), 'benchmark-fixed.json'), 'r') as f:
        text = f.read().decode('latin-1')
        d = json.loads(text)
    return d