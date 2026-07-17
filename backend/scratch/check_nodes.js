const { execSync } = require('child_process');

try {
  const output = execSync('wmic process where "name=\'node.exe\'" get processid,commandline /format:list', { encoding: 'utf-8' });
  console.log(output);
} catch (e) {
  // If wmic is not available, try PowerShell
  const psOutput = execSync('powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq \'node.exe\' } | Select-Object ProcessId, CommandLine | Format-List"', { encoding: 'utf-8' });
  console.log(psOutput);
}
