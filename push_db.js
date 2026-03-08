const { execSync } = require('child_process');
try {
    const result = execSync('npx prisma db push', {
        encoding: 'utf-8',
        stdio: 'pipe',
        env: { ...process.env }
    });
    console.log('SUCCESS:', result);
} catch (e) {
    console.log('STDOUT:', e.stdout);
    console.log('STDERR:', e.stderr);
}
