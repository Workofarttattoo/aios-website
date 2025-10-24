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
        self.modules = {
            'aios': '/Users/noone/aios',
            'consciousness': '/Users/noone/consciousness',
            'TheGAVLSuite': '/Users/noone/TheGAVLSuite',
            'oracle_of_light': '/Users/noone/oracle_of_light',
            'QuLab2.0': '/Users/noone/QuLab2.0',
            'aios-website': '/Users/noone/aios-website',
        }

    def count_lines_of_code(self, directory):
        """Count all lines of code (Python, JS, HTML, CSS, JSON, etc.) in a directory"""
        try:
            result = subprocess.run(
                f"find '{directory}' -type f \\( -name '*.py' -o -name '*.js' -o -name '*.ts' -o -name '*.tsx' -o -name '*.html' -o -name '*.css' -o -name '*.json' -o -name '*.md' \\) ! -path '*/.*' ! -path '*/__pycache__/*' ! -path '*/node_modules/*' ! -path '*/.git/*' -exec wc -l {{}} + | tail -1",
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )
            parts = result.stdout.strip().split()
            return int(parts[0]) if parts and parts[0].isdigit() else 0
        except Exception as e:
            print(f"Error counting LOC in {directory}: {e}")
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
        """Update metrics file with comprehensive module statistics"""
        print("[*] Calculating comprehensive metrics across all modules...")

        # Count lines of code across all modules
        module_locs = {}
        total_loc = 0

        for module_name, module_path in self.modules.items():
            if Path(module_path).exists():
                loc = self.count_lines_of_code(module_path)
                module_locs[module_name] = loc
                total_loc += loc
                print(f"  ✓ {module_name:25s} {loc:>10,} lines")
            else:
                print(f"  ✗ {module_name:25s} (not found)")

        print(f"\n  TOTAL COMPREHENSIVE:         {total_loc:>10,} lines")

        # Count algorithms
        algos = self.count_algorithms()
        print(f"\n  ✓ Quantum algorithms: {algos['quantum']}")
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
        metrics['total_lines_comprehensive'] = total_loc
        metrics['total_lines_all_projects'] = total_loc
        metrics['aios_lines'] = module_locs.get('aios', 0)
        metrics['algorithms']['total'] = algos['total']
        metrics['algorithms']['sovereign_tools']['count'] = algos['tools']
        metrics['algorithms']['ml_algorithms']['count'] = algos['ml']
        metrics['algorithms']['quantum_algorithms']['count'] = algos['quantum']
        metrics['breakdown'] = f"{algos['tools']} Sovereign Tools + {algos['ml']} ML Algorithms + {algos['quantum']} Quantum Algorithms = {algos['total']} Total"

        # Update comprehensive module breakdown
        if 'module_breakdown' not in metrics:
            metrics['module_breakdown'] = {}

        for module_name, loc in module_locs.items():
            pct = (loc / total_loc * 100) if total_loc > 0 else 0
            metrics['module_breakdown'][module_name] = {
                'lines': loc,
                'percentage': round(pct, 1)
            }

        # Update directory stats
        if 'directory_stats' not in metrics:
            metrics['directory_stats'] = {}

        for module_name, loc in module_locs.items():
            metrics['directory_stats'][module_name] = {
                'lines': loc,
                'files': len(list(Path(self.modules[module_name]).glob('**/*')))
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

            # Show comprehensive lines of code
            comprehensive = metrics.get('total_lines_comprehensive', 0)
            if comprehensive > 0:
                print(f"  COMPREHENSIVE Lines of Code: {comprehensive:,}")
                print(f"    Breakdown:")
                if 'module_breakdown' in metrics:
                    for module, data in metrics['module_breakdown'].items():
                        pct = data.get('percentage', 0)
                        lines = data.get('lines', 0)
                        print(f"      • {module:20s} {lines:>10,}  ({pct:5.1f}%)")
            else:
                print(f"  Aios Core Lines of Code: {metrics.get('aios_lines', 'N/A'):,}")

            print(f"\n  Total Algorithms: {metrics['algorithms']['total']}")
            print(f"    - Sovereign Tools: {metrics['algorithms']['sovereign_tools'].get('count', 0)}")
            print(f"    - ML Algorithms: {metrics['algorithms']['ml_algorithms'].get('count', 0)}")
            print(f"    - Quantum Algorithms: {metrics['algorithms']['quantum_algorithms'].get('count', 0)}")
            print(f"\n  Last Updated: {metrics.get('timestamp_readable', 'N/A')}")
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
