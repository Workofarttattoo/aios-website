#!/usr/bin/env python3
"""
Automatic metrics updater for aios.is landing page and timeline
Runs daily to keep algorithm count, lines of code, and progress up to date

Usage:
    python update_metrics.py --all        # Update all metrics
    python update_metrics.py --loc        # Update lines of code only
    python update_metrics.py --algorithms # Update algorithm count only
"""

import json
import subprocess
from pathlib import Path
from datetime import datetime
import sys

class MetricsUpdater:
    def __init__(self):
        self.aios_path = Path('/Users/noone/aios')
        self.website_path = Path('/Users/noone/aios-website')
        self.metrics_file = self.website_path / 'code_metrics.json'

    def count_lines_of_code(self, directory):
        """Count Python lines of code in a directory"""
        try:
            result = subprocess.run(
                f"find {directory} -name '*.py' -type f ! -path '*/.*' ! -path '*/__pycache__/*' -exec wc -l {{}} + | tail -1",
                shell=True,
                capture_output=True,
                text=True
            )
            parts = result.stdout.strip().split()
            return int(parts[0]) if parts else 0
        except Exception as e:
            print(f"Error counting LOC: {e}")
            return 0

    def count_algorithms(self):
        """Count algorithms from source files"""
        quantum_count = 0
        ml_count = 0
        tools_count = 0

        # Count quantum algorithms
        quantum_file = self.aios_path / 'quantum_ml_algorithms.py'
        if quantum_file.exists():
            try:
                result = subprocess.run(
                    f"grep '^class ' {quantum_file} | wc -l",
                    shell=True,
                    capture_output=True,
                    text=True
                )
                quantum_count = int(result.stdout.strip())
            except:
                pass

        # Count ML algorithms
        ml_file = self.aios_path / 'ml_algorithms.py'
        if ml_file.exists():
            try:
                result = subprocess.run(
                    f"grep '^class ' {ml_file} | wc -l",
                    shell=True,
                    capture_output=True,
                    text=True
                )
                ml_count = int(result.stdout.strip())
            except:
                pass

        # Count sovereign tools
        tools_dir = self.aios_path / 'tools'
        if tools_dir.exists():
            py_files = list(tools_dir.glob('*.py'))
            # Subtract __init__.py and other non-tool files
            tools_count = len([f for f in py_files if f.name not in ['__init__.py', '_stubs.py', '_toolkit.py', '_arcade_celebrations.py', '_arcade_visualizers.py', '_quantum_backend.py']])

        return {
            'quantum': quantum_count,
            'ml': ml_count,
            'tools': tools_count,
            'total': quantum_count + ml_count + tools_count
        }

    def update_metrics(self):
        """Update metrics file"""
        print("[*] Calculating current metrics...")

        # Count lines of code
        aios_loc = self.count_lines_of_code(self.aios_path)
        print(f"  ✓ Aios LOC: {aios_loc:,}")

        # Count algorithms
        algos = self.count_algorithms()
        print(f"  ✓ Quantum algorithms: {algos['quantum']}")
        print(f"  ✓ ML algorithms: {algos['ml']}")
        print(f"  ✓ Sovereign tools: {algos['tools']}")
        print(f"  ✓ Total algorithms: {algos['total']}")

        # Read existing metrics
        try:
            with open(self.metrics_file, 'r') as f:
                metrics = json.load(f)
        except:
            metrics = {
                "algorithms": {
                    "sovereign_tools": {"count": 0},
                    "ml_algorithms": {"count": 0, "list": []},
                    "quantum_algorithms": {"count": 0, "list": []},
                    "total": 0
                }
            }

        # Update metrics
        metrics['last_updated'] = datetime.now().isoformat()
        metrics['timestamp_readable'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        metrics['aios_lines'] = aios_loc
        metrics['algorithms']['total'] = algos['total']
        metrics['algorithms']['sovereign_tools']['count'] = algos['tools']
        metrics['algorithms']['ml_algorithms']['count'] = algos['ml']
        metrics['algorithms']['quantum_algorithms']['count'] = algos['quantum']
        metrics['breakdown'] = f"{algos['tools']} Sovereign Tools + {algos['ml']} ML Algorithms + {algos['quantum']} Quantum Algorithms = {algos['total']} Total"

        # Update directory stats
        if 'directory_stats' not in metrics:
            metrics['directory_stats'] = {}

        metrics['directory_stats']['aios'] = {
            'lines': aios_loc,
            'files': len(list(self.aios_path.glob('**/*.py')))
        }

        # Write updated metrics
        with open(self.metrics_file, 'w') as f:
            json.dump(metrics, f, indent=2)

        print(f"\n[✓] Metrics updated successfully!")
        print(f"[*] Next: Update landing page HTML and timeline.html with new numbers")

        return metrics

    def print_summary(self):
        """Print a summary of current metrics"""
        try:
            with open(self.metrics_file, 'r') as f:
                metrics = json.load(f)

            print("\n📊 Current Aios.is Metrics:")
            print(f"  Lines of Code: {metrics.get('aios_lines', 'N/A'):,}")
            print(f"  Total Algorithms: {metrics['algorithms']['total']}")
            print(f"    - Sovereign Tools: {metrics['algorithms']['sovereign_tools'].get('count', 0)}")
            print(f"    - ML Algorithms: {metrics['algorithms']['ml_algorithms'].get('count', 0)}")
            print(f"    - Quantum Algorithms: {metrics['algorithms']['quantum_algorithms'].get('count', 0)}")
            print(f"  Last Updated: {metrics.get('timestamp_readable', 'N/A')}")
        except Exception as e:
            print(f"Error reading metrics: {e}")

def main():
    updater = MetricsUpdater()

    if len(sys.argv) > 1:
        if sys.argv[1] == '--summary':
            updater.print_summary()
        elif sys.argv[1] in ['--all', '--update']:
            updater.update_metrics()
            updater.print_summary()
        elif sys.argv[1] == '--help':
            print(__doc__)
        else:
            print(f"Unknown option: {sys.argv[1]}")
            print(__doc__)
    else:
        updater.update_metrics()
        updater.print_summary()

if __name__ == '__main__':
    main()
