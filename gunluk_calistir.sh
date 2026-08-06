#!/bin/bash
# Gunluk senkronizasyon. Crontab ornegi (her gun 07:00):
#   0 7 * * * /bin/bash /path/to/talha-ticimax-sync/gunluk_calistir.sh >> /path/to/talha-ticimax-sync/sync.log 2>&1
cd "$(dirname "$0")"
echo "===== $(date '+%Y-%m-%d %H:%M:%S') senkronizasyon basladi ====="
python3 sync.py
echo "===== bitti ====="
