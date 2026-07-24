@echo off
REM 방식 B: 브라우저 완전자동 실행 (Windows 작업 스케줄러가 매일 이 파일을 호출)
REM Playwright가 설치된 Python312를 명시적으로 사용하고, 실행 로그를 남깁니다.
cd /d "%~dp0"
set PYTHONIOENCODING=utf-8
set PY="C:\Users\aram\AppData\Local\Programs\Python\Python312\python.exe"
%PY% auto_send.py >> "%~dp0run.log" 2>&1
