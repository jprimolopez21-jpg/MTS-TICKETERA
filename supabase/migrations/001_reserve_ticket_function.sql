-- ─────────────────────────────────────────────────────────────────────────────
-- Ejecutar en el SQL Editor de Supabase antes de arrancar el sistema de compra
-- ─────────────────────────────────────────────────────────────────────────────

-- Reserva atómica de cupos.
-- SELECT FOR UPDATE bloquea la fila durante la transacción, evitando
-- condiciones de carrera cuando dos usuarios compran el último ticket al mismo tiempo.
CREATE OR REPLACE FUNCTION reserve_ticket(
  p_ticket_type_id UUID,
  p_quantity       INT
)
RETURNS TABLE(success BOOLEAN, remaining INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total INT;
  v_sold  INT;
BEGIN
  SELECT total_qty, sold_qty
    INTO v_total, v_sold
    FROM ticket_types
   WHERE id = p_ticket_type_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ticket_type no encontrado: %', p_ticket_type_id;
  END IF;

  IF (v_total - v_sold) < p_quantity THEN
    RETURN QUERY SELECT FALSE, (v_total - v_sold)::INT;
    RETURN;
  END IF;

  UPDATE ticket_types
     SET sold_qty = sold_qty + p_quantity
   WHERE id = p_ticket_type_id;

  RETURN QUERY SELECT TRUE, (v_total - v_sold - p_quantity)::INT;
END;
$$;


-- Libera cupos cuando un pago falla o es cancelado.
-- GREATEST(0, ...) previene que sold_qty quede negativo por bugs o condiciones de carrera.
CREATE OR REPLACE FUNCTION release_ticket_reservation(
  p_ticket_type_id UUID,
  p_quantity       INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ticket_types
     SET sold_qty = GREATEST(0, sold_qty - p_quantity)
   WHERE id = p_ticket_type_id;
END;
$$;
