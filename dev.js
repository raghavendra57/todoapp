const { spawn } = require('child_process');

function startProcess(name, command, cwd) {
  const proc = spawn(command, { 
    cwd, 
    shell: true, 
    stdio: 'inherit' 
  });

  proc.on('error', (err) => {
    console.error(`[${name}] Failed to start:`, err);
  });

  proc.on('close', (code) => {
    console.log(`[${name}] Exited with code ${code}`);
  });

  return proc;
}

console.log('Starting Backend and Frontend...');
startProcess('Backend', 'npm run dev', './backend');
startProcess('Frontend', 'npm run dev', './frontend');
