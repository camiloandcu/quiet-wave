import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const indexPath = `file://${projectRoot}/index.html`;

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  try {
    // Capture console messages to detect errors
    const consoleLogs = [];
    page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
    
    page.on('error', err => console.error('Page error:', err));
    page.on('pageerror', err => console.error('Page JavaScript error:', err));

    // Mock getUserMedia and AudioContext before loading
    await page.evaluateOnNewDocument(() => {
      // Mock getUserMedia to fail gracefully (expected in headless)
      if (!navigator.mediaDevices) {
        navigator.mediaDevices = {};
      }
      navigator.mediaDevices.getUserMedia = async () => {
        throw new Error('getUserMedia not supported in headless browser');
      };
      
      // Verify mocks are in place
      window.testMocksReady = true;
    });

    await page.goto(indexPath, { waitUntil: 'networkidle0' });

    // Verify page loaded successfully
    const pageState = await page.evaluate(() => {
      return {
        title: document.title,
        hasStartBtn: !!document.getElementById('startStop'),
        hasWaveCanvas: !!document.getElementById('waveform'),
        hasSpecCanvas: !!document.getElementById('spectrum'),
        hasWaveLegend: document.body.textContent.includes('Captured headphone signal') && document.body.textContent.includes('Cancellation wave'),
        initialStatus: document.getElementById('status')?.textContent,
        mocksReady: window.testMocksReady
      };
    });

    console.log('✓ Page loaded successfully');
    console.log(`  Title: ${pageState.title}`);
    console.log(`  UI Elements present: Start button: ${pageState.hasStartBtn}, Canvases: ${pageState.hasWaveCanvas && pageState.hasSpecCanvas}`);
    console.log(`  Labels present: legend=${pageState.hasWaveLegend}`);
    console.log(`  Initial status: "${pageState.initialStatus}"`);

    // Click Start button and wait for any errors
    console.log('Clicking Start button...');
    await page.click('#startStop');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check status and console for errors
    const finalStatus = await page.evaluate(() => document.getElementById('status')?.textContent);
    console.log(`  Status after click: "${finalStatus}"`);

    if (consoleLogs.length > 0) {
      console.log('Console messages:', consoleLogs);
    }

    // Success: app loads without crashing
    // In headless mode, getUserMedia will fail, but that's expected
    // The important thing is the app handles errors gracefully
    const appHandledErrors = finalStatus === 'Unsupported' || finalStatus === 'Ready';
    
    if (pageState.hasStartBtn && pageState.hasWaveCanvas && pageState.hasSpecCanvas && pageState.hasWaveLegend && appHandledErrors) {
      console.log('✓ Integration test passed: App loads, UI renders, and handles headless mode gracefully');
      process.exit(0);
    } else {
      console.error('✗ Integration test failed: UI not fully rendered or error handling failed');
      process.exit(1);
    }
  } catch (err) {
    console.error('✗ Integration test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
