cls
@echo off
setlocal

:begin

	cls

	echo [ DEPLOYMENT SYSTEM ]
	echo   2022 Dario Passariello
	echo --------------------------------------------------------------------
	echo;
	echo   1 -- Publish on "alpha" space
	echo   2 -- exit
	echo;
	echo --------------------------------------------------------------------
	set /P rmFunc="Enter a choice: "
	echo --------------------------------------------------------------------

	for %%I in (1 2 x) do if #%rmFunc%==#%%I goto run%%I
	goto begin

:run1

	cd ../..
	pushd %~dp0..\..\
	set THISDIR=%cd%\
	set PROJECT=X:\a51\www
	popd

	for /f "tokens=3,2,4 delims=/- " %%x in ("%date%") do set d=%%z%%x%%y
	for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /format:list') do set datetime=%%I
	set logtime=%datetime:~8,6%
	for /f "skip=1" %%x in ('wmic os get localdatetime') do if not defined tmpDate set tmpDate=%%x
	set data=%tmpDate:~0,4%%tmpDate:~4,2%%tmpDate:~6,2%

	cls

	echo [ %THISDIR% to %PROJECT% ]

  echo;

	xcopy /s/e/h/v/k/y /EXCLUDE:%THISDIR%.dev\batch\exclude.txt %THISDIR% %PROJECT%

	@REM %cd%\dist\
	cd /d %PROJECT%
	echo %PROJECT%
	call npm i

	goto :EOF
	goto begin

:run2

	goto :EOF
	goto begin

	endlocal

	goto :EOF
