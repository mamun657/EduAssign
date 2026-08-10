@echo off
cd /d "C:\EduAssign\server\EduAssignPro.Tests\bin\Debug\net10.0"
dotnet vstest EduAssignPro.Tests.dll --logger:console;verbosity=normal > "C:\EduAssign\qa-scripts\results\phase6_vstest_stdout.txt" 2> "C:\EduAssign\qa-scripts\results\phase6_vstest_stderr.txt"
echo EXIT=%errorlevel% >> "C:\EduAssign\qa-scripts\results\phase6_vstest_stdout.txt"
exit /b %errorlevel%