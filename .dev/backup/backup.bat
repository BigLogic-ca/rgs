@echo off
setlocal

:begin

cls

cd ../..
pushd %~dp0..\..\
set THISDIR=%CD%
popd

for /f "tokens=3,2,4 delims=/- " %%x in ("%date%") do set d=%%z%%x%%y
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /format:list') do set datetime=%%I
set logtime=%datetime:~8,6%
for /f "skip=1" %%x in ('wmic os get localdatetime') do if not defined tmpDate set tmpDate=%%x
set data=%tmpDate:~0,4%%tmpDate:~4,2%%tmpDate:~6,2%

cls

echo %THISDIR%

"%THISDIR%\.dev\backup\7z.exe" a -tzip %THISDIR%\.backup\%data%.%logtime%.zip %THISDIR% -xr!node_modules -xr!.backup -xr!.git
attrib +h %THISDIR%\.backup
echo Zip created into %THISDIR%\.backup!

@REM pause
@REM exit

:no
@REM exit

@REM ///////////////////////////////////////////////////////////////////////

@REM echo THIS FILE RUN BACKUP.
@REM echo CREATED BY DARIO PASSARIELLO.
@REM echo[

@REM goto :start

@REM This file permit to run BackUp as Zip file (using 7z) for the APP.
@REM Please don't change anything without authorization.
@REM In case needs help please call the back-end department.
@REM You need to install 7z free software before using this batch

@REM :start

@REM :choice
@REM set /P c=Are you sure you want to continue( [Y]/N )? Y
@REM if /I "%c%" EQU "" goto :yes
@REM if /I "%c%" EQU "y" goto :yes
@REM if /I "%c%" EQU "Y" goto :yes
@REM if /I "%c%" EQU "N" goto :no
@REM goto :choice

@REM :yes
