import stripe from "stripe";
import Booking from "../models/Booking.js";

// API to handle Stripe Webhooks
export const stripeWebhooks = async (request, response) => {
    // Stripe gateway initialization
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
    const sig = request.headers['stripe-signature'];
    let event;

    try {
        event = stripeInstance.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return response.status(400).send(`Webhook Error: ${err.message}`); // Return here
    }

    // Handle the event
    if (event.type === "payment_intent.succeeded") { // Use the correct event type
        const paymentIntent = event.data.object;
        const paymentIntentId = paymentIntent.id;

        // Getting session metadata
        const session = await stripeInstance.checkout.sessions.list({
            payment_intent: paymentIntentId,
        });

        // Check if session data is not empty
        if (session.data.length > 0) {
            const { bookingId } = session.data[0].metadata;

            // Mark payment as paid
            try {
                await Booking.findByIdAndUpdate(bookingId, { isPaid: true, paymentMethod: "Stripe" });
                console.log(`Booking ${bookingId} updated successfully.`);
            } catch (error) {
                console.error("Error updating booking:", error);
            }
        } else {
            console.log("No session data found for payment intent:", paymentIntentId);
        }
    } else {
        console.log("Unhandled event type:", event.type);
    }

    response.json({ received: true });
};


