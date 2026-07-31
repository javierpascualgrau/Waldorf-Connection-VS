-- Auto-liberación de seguridad: si el comprador no confirma en 14 días desde 'enviado',
-- un cron diario llama a la Edge Function auto-release-payments para liberar el pago igualmente.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- El service role key se guarda en Supabase Vault (Dashboard > Project Settings > Vault),
-- nunca hardcodeado en una migración versionada en git:
--   select vault.create_secret('<service_role_key>', 'service_role_key');
-- Ejecutar esa línea manualmente en el SQL editor antes de aplicar este cron.
select cron.schedule(
  'auto-release-payments-daily',
  '0 6 * * *',
  $$
  select net.http_post(
    url := 'https://lnwuceglgzdnskkpulmg.supabase.co/functions/v1/auto-release-payments',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
      'Content-Type', 'application/json'
    )
  );
  $$
);
