@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT_DIR=%~dp0"
set "ROOT_DIR=%ROOT_DIR:~0,-1%"
set "BACKEND_DIR=%ROOT_DIR%\backend"
set "FRONTEND_DIR=%ROOT_DIR%\frontend"
set "RUNTIME_DIR=%ROOT_DIR%\.runtime"

if "%BACKEND_PORT%"=="" set "BACKEND_PORT=8000"
if "%FRONTEND_PORT%"=="" set "FRONTEND_PORT=5174"
if "%FRONTEND_HOST%"=="" set "FRONTEND_HOST=127.0.0.1"

set "BACKEND_PID=%RUNTIME_DIR%\backend.pid"
set "FRONTEND_PID=%RUNTIME_DIR%\frontend.pid"
set "BACKEND_LOG=%RUNTIME_DIR%\backend.log"
set "FRONTEND_LOG=%RUNTIME_DIR%\frontend.log"
set "BACKEND_RUN=%RUNTIME_DIR%\run-backend.cmd"
set "FRONTEND_RUN=%RUNTIME_DIR%\run-frontend.cmd"
set "BACKEND_PY=%BACKEND_DIR%\venv\Scripts\python.exe"

set "ACTION=%~1"
set "TARGET=%~2"
set "DOUBLE_CLICK=0"
set "OPEN_AFTER_START=0"
if "%ACTION%"=="" (
  set "ACTION=start"
  set "DOUBLE_CLICK=1"
  set "OPEN_AFTER_START=1"
)
if /I "%ACTION%"=="launch" (
  set "ACTION=start"
  set "OPEN_AFTER_START=1"
)

if /I "%ACTION%"=="start" goto start
if /I "%ACTION%"=="stop" goto stop
if /I "%ACTION%"=="restart" goto restart
if /I "%ACTION%"=="status" goto status
if /I "%ACTION%"=="open" goto open
if /I "%ACTION%"=="access" goto open
if /I "%ACTION%"=="logs" goto logs
if /I "%ACTION%"=="log" goto logs
if /I "%ACTION%"=="review" goto logs
if /I "%ACTION%"=="revie" goto logs
if /I "%ACTION%"=="help" goto help
if /I "%ACTION%"=="-h" goto help
if /I "%ACTION%"=="--help" goto help

echo Unknown command: %ACTION%
echo.
goto help

:start
set "START_FAILED=0"
if not exist "%RUNTIME_DIR%" mkdir "%RUNTIME_DIR%"
call :StartBackend
if errorlevel 1 set "START_FAILED=1"
call :StartFrontend
if errorlevel 1 set "START_FAILED=1"
if "%START_FAILED%"=="1" (
  echo.
  echo One or more services did not start.
  goto fail
)
echo.
echo App:  http://%FRONTEND_HOST%:%FRONTEND_PORT%
echo API:  http://127.0.0.1:%BACKEND_PORT%/docs
if "%OPEN_AFTER_START%"=="1" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 2" >nul 2>nul
  echo Opening http://%FRONTEND_HOST%:%FRONTEND_PORT%
  start "" "http://%FRONTEND_HOST%:%FRONTEND_PORT%"
)
goto end

:stop
call :StopService "frontend" "%FRONTEND_PID%" "%FRONTEND_PORT%"
call :StopService "backend" "%BACKEND_PID%" "%BACKEND_PORT%"
goto end

:restart
set "START_FAILED=0"
call :StopService "frontend" "%FRONTEND_PID%" "%FRONTEND_PORT%"
call :StopService "backend" "%BACKEND_PID%" "%BACKEND_PORT%"
call :StartBackend
if errorlevel 1 set "START_FAILED=1"
call :StartFrontend
if errorlevel 1 set "START_FAILED=1"
if "%START_FAILED%"=="1" (
  echo.
  echo One or more services did not start.
  goto fail
)
echo.
echo App:  http://%FRONTEND_HOST%:%FRONTEND_PORT%
echo API:  http://127.0.0.1:%BACKEND_PORT%/docs
goto end

:status
call :PrintStatus "backend" "%BACKEND_PID%" "%BACKEND_PORT%" "%BACKEND_LOG%"
call :PrintStatus "frontend" "%FRONTEND_PID%" "%FRONTEND_PORT%" "%FRONTEND_LOG%"
goto end

:open
if /I "%TARGET%"=="api" (
  start "" "http://127.0.0.1:%BACKEND_PORT%/docs"
  goto end
)
if /I "%TARGET%"=="docs" (
  start "" "http://127.0.0.1:%BACKEND_PORT%/docs"
  goto end
)
start "" "http://%FRONTEND_HOST%:%FRONTEND_PORT%"
goto end

:logs
if not exist "%RUNTIME_DIR%" mkdir "%RUNTIME_DIR%"
if /I "%TARGET%"=="backend" goto logs_backend
if /I "%TARGET%"=="api" goto logs_backend
if /I "%TARGET%"=="frontend" goto logs_frontend
if /I "%TARGET%"=="web" goto logs_frontend
if /I "%TARGET%"=="all" goto logs_all
if /I "%TARGET%"=="logs" goto logs_all
if /I "%TARGET%"=="log" goto logs_all
if "%TARGET%"=="" goto logs_all
echo Unknown log target: %TARGET%
echo Use: polizas.bat logs [backend^|frontend^|all]
goto end

:logs_backend
call :TouchLog "%BACKEND_LOG%"
powershell -NoProfile -ExecutionPolicy Bypass -NoExit -Command "Get-Content -Path '%BACKEND_LOG%' -Tail 160 -Wait"
goto end

:logs_frontend
call :TouchLog "%FRONTEND_LOG%"
powershell -NoProfile -ExecutionPolicy Bypass -NoExit -Command "Get-Content -Path '%FRONTEND_LOG%' -Tail 160 -Wait"
goto end

:logs_all
call :TouchLog "%BACKEND_LOG%"
call :TouchLog "%FRONTEND_LOG%"
start "Backend logs" powershell -NoProfile -ExecutionPolicy Bypass -NoExit -Command "Get-Content -Path '%BACKEND_LOG%' -Tail 160 -Wait"
start "Frontend logs" powershell -NoProfile -ExecutionPolicy Bypass -NoExit -Command "Get-Content -Path '%FRONTEND_LOG%' -Tail 160 -Wait"
goto end

:help
echo Polizas dev helper
echo.
echo Usage:
echo   polizas.bat                       Start and open the web app
echo   polizas.bat start                 Start backend and frontend
echo   polizas.bat stop                  Stop services started by this helper
echo   polizas.bat restart               Stop, then start again
echo   polizas.bat status                Show PID, port, and log paths
echo   polizas.bat open                  Open the web app
echo   polizas.bat open api              Open FastAPI docs
echo   polizas.bat logs                  Open backend and frontend log tails
echo   polizas.bat logs backend          Tail backend log
echo   polizas.bat logs frontend         Tail frontend log
echo.
echo Defaults:
echo   BACKEND_PORT=%BACKEND_PORT%
echo   FRONTEND_PORT=%FRONTEND_PORT%
echo.
echo Override example:
echo   set FRONTEND_PORT=5173
echo   polizas.bat start
goto end

:StartBackend
call :IsRunning "%BACKEND_PID%"
if "%ERRORLEVEL%"=="0" (
  for /f "usebackq delims=" %%P in ("%BACKEND_PID%") do echo Backend already running: PID %%P
  exit /b 0
)
if not exist "%BACKEND_PY%" (
  echo Backend venv not found: "%BACKEND_PY%"
  echo Create/install the backend venv before starting.
  exit /b 1
)
call :IsPortInUse "%BACKEND_PORT%"
if "%ERRORLEVEL%"=="0" (
  echo Backend port %BACKEND_PORT% is already in use by another process.
  echo Run "polizas.bat status" to inspect it, or free the port before starting.
  exit /b 1
)
>> "%BACKEND_LOG%" echo.
>> "%BACKEND_LOG%" echo ==== Starting backend %DATE% %TIME% on port %BACKEND_PORT% ====
> "%BACKEND_RUN%" echo @echo off
>> "%BACKEND_RUN%" echo cd /d "%BACKEND_DIR%"
>> "%BACKEND_RUN%" echo "%BACKEND_PY%" -m uvicorn app.main:app --reload --port %BACKEND_PORT% ^>^> "%BACKEND_LOG%" 2^>^&1
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $p=Start-Process -FilePath '%BACKEND_RUN%' -WindowStyle Hidden -PassThru; $p.Id | Set-Content -Path '%BACKEND_PID%'; Write-Output $p.Id"
if errorlevel 1 (
  echo Failed to start backend. Check %BACKEND_LOG%
  exit /b 1
)
for /f "usebackq delims=" %%P in ("%BACKEND_PID%") do echo Backend started: PID %%P
exit /b 0

:StartFrontend
call :IsRunning "%FRONTEND_PID%"
if "%ERRORLEVEL%"=="0" (
  for /f "usebackq delims=" %%P in ("%FRONTEND_PID%") do echo Frontend already running: PID %%P
  exit /b 0
)
if not exist "%FRONTEND_DIR%\node_modules" (
  echo Frontend node_modules not found. Run npm install in "%FRONTEND_DIR%" first.
  exit /b 1
)
call :IsPortInUse "%FRONTEND_PORT%"
if "%ERRORLEVEL%"=="0" (
  echo Frontend port %FRONTEND_PORT% is already in use by another process.
  echo Run "polizas.bat status" to inspect it, or free the port before starting.
  exit /b 1
)
>> "%FRONTEND_LOG%" echo.
>> "%FRONTEND_LOG%" echo ==== Starting frontend %DATE% %TIME% on port %FRONTEND_PORT% ====
> "%FRONTEND_RUN%" echo @echo off
>> "%FRONTEND_RUN%" echo cd /d "%FRONTEND_DIR%"
>> "%FRONTEND_RUN%" echo npm.cmd run dev -- --host %FRONTEND_HOST% --port %FRONTEND_PORT% ^>^> "%FRONTEND_LOG%" 2^>^&1
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $p=Start-Process -FilePath '%FRONTEND_RUN%' -WindowStyle Hidden -PassThru; $p.Id | Set-Content -Path '%FRONTEND_PID%'; Write-Output $p.Id"
if errorlevel 1 (
  echo Failed to start frontend. Check %FRONTEND_LOG%
  exit /b 1
)
for /f "usebackq delims=" %%P in ("%FRONTEND_PID%") do echo Frontend started: PID %%P
exit /b 0

:StopService
set "SERVICE_NAME=%~1"
set "SERVICE_PID_FILE=%~2"
set "SERVICE_PORT=%~3"
if not exist "%SERVICE_PID_FILE%" (
  call :IsPortInUse "%SERVICE_PORT%"
  if "!ERRORLEVEL!"=="0" (
    echo %SERVICE_NAME% has no PID file, but port %SERVICE_PORT% is in use. Stopping that port owner...
    call :KillPort "%SERVICE_PORT%" "%SERVICE_NAME%"
    exit /b 0
  )
  echo %SERVICE_NAME% is not running.
  exit /b 0
)
set /p SERVICE_PID=<"%SERVICE_PID_FILE%"
if "%SERVICE_PID%"=="" (
  del "%SERVICE_PID_FILE%" >nul 2>nul
  echo %SERVICE_NAME% had an empty PID file; cleaned it up.
  exit /b 0
)
tasklist /FI "PID eq %SERVICE_PID%" 2>nul | findstr /R "\<%SERVICE_PID%\>" >nul
if errorlevel 1 (
  del "%SERVICE_PID_FILE%" >nul 2>nul
  call :IsPortInUse "%SERVICE_PORT%"
  if "!ERRORLEVEL!"=="0" (
    echo %SERVICE_NAME% had stale PID %SERVICE_PID%, but port %SERVICE_PORT% is in use. Stopping that port owner...
    call :KillPort "%SERVICE_PORT%" "%SERVICE_NAME%"
  ) else (
    echo %SERVICE_NAME% was not running; removed stale PID %SERVICE_PID%.
  )
  exit /b 0
)
echo Stopping %SERVICE_NAME% PID %SERVICE_PID%...
taskkill /PID %SERVICE_PID% /T /F >nul 2>nul
del "%SERVICE_PID_FILE%" >nul 2>nul
call :IsPortInUse "%SERVICE_PORT%"
if "!ERRORLEVEL!"=="0" call :KillPort "%SERVICE_PORT%" "%SERVICE_NAME%"
echo %SERVICE_NAME% stopped.
exit /b 0

:PrintStatus
set "STATUS_NAME=%~1"
set "STATUS_PID_FILE=%~2"
set "STATUS_PORT=%~3"
set "STATUS_LOG=%~4"
call :IsRunning "%STATUS_PID_FILE%"
if "%ERRORLEVEL%"=="0" (
  for /f "usebackq delims=" %%P in ("%STATUS_PID_FILE%") do echo %STATUS_NAME%: running, PID %%P, port %STATUS_PORT%, log "%STATUS_LOG%"
) else (
  call :IsPortInUse "%STATUS_PORT%"
  if "!ERRORLEVEL!"=="0" (
    echo %STATUS_NAME%: stopped by helper, but port %STATUS_PORT% is in use by another process, log "%STATUS_LOG%"
  ) else (
    echo %STATUS_NAME%: stopped, port %STATUS_PORT%, log "%STATUS_LOG%"
  )
)
exit /b 0

:IsRunning
set "CHECK_PID_FILE=%~1"
if not exist "%CHECK_PID_FILE%" exit /b 1
set /p CHECK_PID=<"%CHECK_PID_FILE%"
if "%CHECK_PID%"=="" exit /b 1
tasklist /FI "PID eq %CHECK_PID%" 2>nul | findstr /R "\<%CHECK_PID%\>" >nul
exit /b %ERRORLEVEL%

:IsPortInUse
powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Get-NetTCPConnection -LocalPort %~1 -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>nul
exit /b %ERRORLEVEL%

:KillPort
powershell -NoProfile -ExecutionPolicy Bypass -Command "$pids = Get-NetTCPConnection -LocalPort %~1 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($processId in $pids) { if ($processId -gt 0) { taskkill.exe /PID $processId /T /F | Out-Null } }"
echo %~2 port %~1 stopped.
exit /b 0

:TouchLog
if not exist "%~1" type nul > "%~1"
exit /b 0

:end
endlocal
exit /b 0

:fail
if "%DOUBLE_CLICK%"=="1" (
  echo.
  echo Press any key to close this window.
  pause >nul
)
endlocal
exit /b 1
