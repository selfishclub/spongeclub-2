@echo off
REM 셸 기회 감지 수집봇 (30분마다 작업 스케줄러가 실행)
cd /d "%~dp0"
set PYTHONIOENCODING=utf-8
set PY="C:\Users\aram\AppData\Local\Programs\Python\Python312\python.exe"
%PY% collector.py >> "%~dp0collector.log" 2>&1
