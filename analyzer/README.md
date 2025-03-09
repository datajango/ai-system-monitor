# README.md for analyzer

1. For a single snapshot (old behavior):

```sh
python analyzer/main.py /path/to/snapshot --model gemma-2-9b-it --output-dir /path/to/output --clean
```

2. For batch processing (new behavior):

```sh
python analyzer/main.py --input-dir /d/Snapshots --model gemma-2-9b-it --output-dir /d/system-monitor/section-analysis --clean
```
