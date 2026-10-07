import { expect, test, type Page } from '@playwright/test';

/** El demo arranca siempre con la misma flota (semilla fija) y localStorage vacío. */
async function open(page: Page) {
  await page.goto('./');
  await expect(page.locator('.bus-row')).toHaveCount(20);
}

test.describe('Rumbo · consola de flota (modo demo)', () => {
  test('carga en español con marca, metadatos y mapa', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await open(page);
    await expect(page).toHaveTitle('Rumbo · Consola de flota en vivo');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByTestId('kpi-active')).toHaveText('20');
    await expect(page.getByTestId('clock')).toHaveText(/^\d{2}:\d{2}:\d{2}$/);

    const brand = page.getByTestId('brand');
    await expect(brand).toHaveAttribute('href', 'https://jfredmc.github.io/portfolio/');
    await expect(brand).toHaveAttribute('target', '_blank');
    await expect(brand).toHaveAttribute('rel', /noopener/);
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', 'favicon.svg');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /og\.jpg$/);

    await expect(page.locator('.maplibregl-canvas')).toBeVisible({ timeout: 15_000 });
    expect(errors).toEqual([]);
  });

  test('elegir un bus muestra el detalle, seguirlo y sacarlo de servicio', async ({
    page,
    isMobile,
  }) => {
    await open(page);
    await page.getByTestId('bus-RB-101').click();
    if (isMobile)
      await expect(page.getByRole('button', { name: 'Detalle', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    await expect(page.getByTestId('detail-code')).toHaveText('RB-101');
    await expect(page.getByTestId('detail-eta')).toHaveText(/min|llegando/);
    await expect(page.getByRole('button', { name: 'Siguiendo' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.getByRole('button', { name: 'Sacar de servicio' }).click();
    await expect(page.getByTestId('detail-status')).toHaveText('Fuera de servicio');
    await expect(page.getByTestId('kpi-active')).toHaveText('19');

    // El estado se guarda en el navegador y sobrevive a la recarga.
    await page.reload();
    await expect(page.getByTestId('kpi-active')).toHaveText('19');
    await page.getByTestId('bus-RB-101').click();
    await page.getByRole('button', { name: 'Reintegrar' }).click();
    await expect(page.getByTestId('kpi-active')).toHaveText('20');
  });

  test('filtrar por ruta y buscar', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'B', exact: true }).click();
    const rows = page.locator('.bus-row');
    await expect(rows).toHaveCount(4);
    for (const tag of await rows.locator('.route-tag').allTextContents())
      expect(tag.trim()).toBe('B');
    await page.getByRole('button', { name: 'Todas' }).click();
    await page.getByPlaceholder('Buscar bus, conductor o parada').fill('rb-3');
    await expect(rows).toHaveCount(3);
  });

  test('tablero de llegadas de una parada', async ({ page }) => {
    await open(page);
    await page.getByPlaceholder('Buscar bus, conductor o parada').fill('plaza mayor');
    await page.locator('.stop-match', { hasText: 'Plaza Mayor' }).click();
    await expect(page.getByTestId('stop-name')).toHaveText('Plaza Mayor');
    const arrivals = page.getByTestId('arrivals').locator('.board-row');
    await expect(arrivals.first()).toBeVisible();
    await arrivals.first().click();
    await expect(page.getByTestId('detail-code')).toHaveText(/^RB-\d{3}$/);
  });

  test('simular y despejar un incidente', async ({ page, isMobile }) => {
    await open(page);
    await page.getByRole('button', { name: 'Simular incidente' }).click();
    await page.getByRole('menuitem', { name: /Ruta C/ }).click();
    await expect(page.getByTestId('kpi-incidents')).toHaveText('1');
    if (isMobile) await page.getByRole('button', { name: 'Bitácora', exact: true }).click();
    await expect(page.getByTestId('event-log')).toContainText('Incidente');
    await page.getByRole('button', { name: 'Despejar' }).click();
    await expect(page.getByTestId('kpi-incidents')).toHaveText('0');
  });

  test('pausa y velocidad de la simulación', async ({ page }) => {
    await open(page);
    const clock = page.getByTestId('clock');
    await page.getByTestId('toggle-run').click();
    await expect(page.getByText('En pausa')).toBeVisible();
    const paused = await clock.textContent();
    await page.waitForTimeout(1500);
    await expect(clock).toHaveText(paused!);

    await page.getByTestId('toggle-run').click();
    await page.getByRole('button', { name: '20×' }).click();
    const toSec = (t: string) =>
      t
        .split(':')
        .map(Number)
        .reduce((a, b) => a * 60 + b);
    const t0 = toSec((await clock.textContent())!);
    await page.waitForTimeout(2000);
    expect(toSec((await clock.textContent())!) - t0).toBeGreaterThanOrEqual(25);
  });

  test('tema claro/oscuro recordado', async ({ page }) => {
    await open(page);
    const html = page.locator('html');
    const before = await html.getAttribute('data-theme');
    await page.getByTestId('theme').click();
    const after = before === 'dark' ? 'light' : 'dark';
    await expect(html).toHaveAttribute('data-theme', after);
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', after);
  });

  test('ruta desconocida devuelve 404 con la app', async ({ page }) => {
    const res = await page.goto('no-existe');
    expect(res?.status()).toBe(404);
    await expect(page.locator('.bus-row')).toHaveCount(20);
  });
});
