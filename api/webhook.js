const FIREBASE_DB_URL = "https://pegas-barbearia-d664a-default-rtdb.firebaseio.com";
const FIREBASE_SECRET = process.env.FIREBASE_SECRET || "sBzRy7fNpAIcspshti7LHqVDPK1ECtC8qmjHPkV7";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const event = body.event;
    const payment = body.payment;

    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
      const emailCliente = payment?.customerEmail || body?.customer?.email;

      if (emailCliente) {
        const getRes = await fetch(`${FIREBASE_DB_URL}/assinaturasGestores.json?auth=${FIREBASE_SECRET}`);
        if (!getRes.ok) {
          throw new Error(`Erro ao ler Firebase: ${getRes.status}`);
        }

        const gestores = (await getRes.json()) || {};

        let uidEncontrado = null;
        for (const uid in gestores) {
          if (gestores[uid]?.email && gestores[uid].email.toLowerCase() === emailCliente.toLowerCase()) {
            uidEncontrado = uid;
            break;
          }
        }

        if (uidEncontrado) {
          const dataHoje = new Date();
          dataHoje.setDate(dataHoje.getDate() + 30);
          const novaDataVencimento = dataHoje.toISOString().split("T")[0];

          const patchRes = await fetch(
            `${FIREBASE_DB_URL}/assinaturasGestores/${uidEncontrado}.json?auth=${FIREBASE_SECRET}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                planoPro: true,
                vencimento: novaDataVencimento
              })
            }
          );

          if (!patchRes.ok) {
            throw new Error(`Erro ao atualizar Firebase: ${patchRes.status}`);
          }

          return res.status(200).json({ success: true, uid: uidEncontrado });
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Erro no webhook:", error.message);
    return res.status(500).json({ error: error.message });
  }
};sBzRy7fNpAIcspshti7LHqVDPK1ECtC8qmjHPkV7
