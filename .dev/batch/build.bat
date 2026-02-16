cls

@echo off
setlocal

:begin

cls

  cd ../..
  pushd %~dp0..\..\
  set THISDIR=%cd%\
  popd

	echo [ %THISDIR% to %THISDIR%build\ ]

  echo;

  copy /s/e/h/v/k/y /EXCLUDE:%THISDIR%\.dev\batch\exclude.txt %THISDIR% %THISDIR%build\
