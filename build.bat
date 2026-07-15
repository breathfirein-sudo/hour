@echo off
echo =========================================
echo Building Frontend Production Bundle...
echo =========================================
cd frontend
npm run build
cd ..
echo =========================================
echo Build completed successfully!
echo =========================================
pause
