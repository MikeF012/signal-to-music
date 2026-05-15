@echo off
REM Wrapper so keytool works even when JDK\bin is missing from PATH (e.g. Cursor started before PATH refresh).
"C:\Program Files\Java\jdk-21\bin\keytool.exe" %*
