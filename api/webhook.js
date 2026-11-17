const axios = require('axios');

const FIREBASE_DB_URL = "https://pegas-barbearia-d664a-default-rtdb.firebaseio.com";
// Cole aqui o segredo copiado do Firebase (ou configure como variável de ambiente na Vercel)
const FIREBASE_SECRET = process.env.FIREBASE_SECRET || "sBzRy7fNpAIcspshti7LHqVDPK1ECtC8qmjHPkV7";

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const event = req.body.event;
    const payment = req.body.payment;

    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
      const emailCliente = payment?.customerEmail || req.body?.customer?.email;

      if (emailCliente) {
        // 1. Consulta usando ?auth= para ter permissão de leitura
        const response = await axios.get(`${FIREBASE_DB_URL}/assinaturasGestores.json?auth=${FIREBASE_SECRET}`);
        const gestores = response.data || {};

        let uidEncontrado = null;
        for (let uid in gestores) {
          if (gestores[uid].email && gestores[uid].email.toLowerCase() === emailCliente.toLowerCase()) {
            uidEncontrado = uid;
            break;
          }
        }

        if (uidEncontrado) {
          const dataHoje = new Date();
          dataHoje.setDate(dataHoje.getDate() + 30);
          const novaDataVencimento = dataHoje.toISOString().split('T')[0];

          // 2. Grava usando ?auth= para ter permissão de escrita
          await axios.patch(`${FIREBASE_DB_URL}/assinaturasGestores/${uidEncontrado}.json?auth=${FIREBASE_SECRET}`, {
            planoPro: true,
            vencimento: novaDataVencimento
          });

          return res.status(200).json({ success: true, uid: uidEncontrado });
        }
      }
    }

    // Sempre responda 200 OK para o Asaas não pausar o webhook
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Erro no webhook:", error.response?.data || error.message);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
};
