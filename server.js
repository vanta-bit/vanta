const express = require("express");
const dotenv = require("dotenv");
const fs = require("fs");
const session = require("express-session");

dotenv.config();

const app = express();

app.get("/hello", (req, res) => {
    res.send("VANTA SERVER IS WORKING");
});

app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false
    }
}));

app.use(express.static("."));


// ===============================
// PAYSTACK INITIALIZE PAYMENT
// ===============================

app.post("/api/paystack/initialize", async (req, res) => {
    try {
        const { email, amount, firstName, phone, metadata } = req.body;

        if (!email || !amount) {
            return res.status(400).json({
                status: false,
                message: "Email and amount are required."
            });
        }

        const response = await fetch(
            "https://api.paystack.co/transaction/initialize",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email,
                    amount: amount,
                    currency: "GHS",
                    first_name: firstName,
                    phone: phone,
                    metadata: metadata
                })
            }
        );

        const data = await response.json();

        res.status(response.ok ? 200 : response.status).json(data);

    } catch (error) {
        console.error("Paystack error:", error);

        res.status(500).json({
            status: false,
            message: "Server error while initializing payment."
        });
    }
});


// ===============================
// PAYSTACK VERIFY PAYMENT
// ===============================

app.post("/api/paystack/verify", async (req, res) => {
    try {
        const { reference, expectedAmount } = req.body;

        if (!reference || !expectedAmount) {
            return res.status(400).json({
                status: false,
                message: "Reference and expected amount are required."
            });
        }

        const response = await fetch(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok || !data.status) {
            return res.status(400).json({
                status: false,
                message: "Could not verify transaction."
            });
        }

        const transaction = data.data;

        if (transaction.status !== "success") {
            return res.status(400).json({
                status: false,
                message: "Payment was not successful."
            });
        }

       if (Number(transaction.amount) !== Number(expectedAmount)) {

    console.error("AMOUNT MISMATCH");
    console.error("Paystack amount:", transaction.amount);
    console.error("Order amount:", expectedAmount);
    console.error("Order total received:", total);

    return res.status(400).json({
        status: false,
        message:
            "Amount mismatch. Paystack: GHS" +
            (Number(transaction.amount) / 100).toFixed(2) +
            " | Order: GHS" +
            Number(total).toFixed(2)
    });
}

        res.json({
            status: true,
            message: "Payment verified successfully.",
            data: transaction
        });

    } catch (error) {
        console.error("Payment verification error:", error);

        res.status(500).json({
            status: false,
            message: "Server error while verifying payment."
        });
    }
});

console.log("REGISTERING ADMIN LOGIN ROUTE");


// ADMIN LOGIN
app.post("/api/admin/login", (req, res) => {
    console.log("ADMIN LOGIN REQUEST RECEIVED");

    const { username, password } = req.body;

    if (
        username === process.env.ADMIN_USERNAME &&
        password === process.env.ADMIN_PASSWORD
    ) {
        req.session.isAdmin = true;

        return res.json({
            status: true,
            message: "Login successful."
        });
    }

    res.status(401).json({
        status: false,
        message: "Invalid username or password."
    });
});

// ADMIN LOGOUT
app.post("/api/admin/logout", (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                status: false,
                message: "Could not log out."
            });
        }

        res.json({
            status: true,
            message: "Logged out successfully."
        });
    });
});

app.get("/api/test", (req, res) => {
    res.json({
        status: true,
        message: "VANTA API is working"
    });
});

app.get("/api/orders-test", (req, res) => {
    console.log("ORDERS TEST ROUTE HIT");
    res.json({
        status: true,
        message: "Orders route is reachable"
    });
});


// SAVE ORDER
app.post("/api/orders", async (req, res) => {
    try {
        const {
            customer,
            items,
            total,
            paymentReference
        } = req.body;

        // Check required order information
const missingFields = [];

if (!customer) missingFields.push("customer");
if (!customer?.email) missingFields.push("customer email");
if (!items) missingFields.push("items");
if (!Array.isArray(items)) missingFields.push("items is not an array");
if (total === undefined || total === null) missingFields.push("total");
if (!paymentReference) missingFields.push("payment reference");

if (missingFields.length > 0) {
    console.error("MISSING ORDER FIELDS:", missingFields);
    console.error("ORDER DATA RECEIVED:", req.body);

    return res.status(400).json({
        status: false,
        message: "Missing: " + missingFields.join(", ")
    });
}

        // Verify payment directly with Paystack
        const response = await fetch(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(paymentReference)}`,
            {
                headers: {
                    Authorization:
                        `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
                }
            }
        );

        const data = await response.json();

        // Paystack verification failed
        if (!response.ok || !data.status) {
    console.error("Paystack order verification failed:", data);

    return res.status(400).json({
        status: false,
        message: data.message || "Payment could not be verified."
    });
}

        const transaction = data.data;

        // Payment must actually be successful
        if (transaction.status !== "success") {
            return res.status(400).json({
                status: false,
                message: "Payment was not successful."
            });
        }

        // Make sure the amount paid matches the order total
       const orderTotal = Number(total);
const expectedAmount = Math.round(orderTotal * 100);

console.log("===== ORDER PAYMENT CHECK =====");
console.log("Payment reference:", paymentReference);
console.log("Paystack amount:", transaction.amount);
console.log("Order total:", total);
console.log("Expected amount:", expectedAmount);
console.log("===============================");

if (Number(transaction.amount) !== Number(expectedAmount)) {
    return res.status(400).json({
        status: false,
        message:
            "Amount mismatch. Paystack=" +
            transaction.amount +
            " Expected=" +
            expectedAmount
    });
}


        // Create order only after successful verification
        const order = {
            id: Date.now(),
            date: new Date().toISOString(),
            customer: customer,
            items: items,
            total: orderTotal,
            paymentReference: paymentReference,
            paymentStatus: "paid",
            orderStatus: "Pending"
        };

        let orders = [];

        if (fs.existsSync("orders.json")) {
            const file = fs.readFileSync("orders.json", "utf8");

            if (file.trim()) {
                orders = JSON.parse(file);
            }
        }

        orders.push(order);

        fs.writeFileSync(
            "orders.json",
            JSON.stringify(orders, null, 2)
        );

        res.json({
            status: true,
            message: "Order saved successfully.",
            orderId: order.id
        });

    } catch (error) {
        console.error("Order saving error:", error);

        res.status(500).json({
            status: false,
            message: "Could not save order."
        });
    }
});


// GET ORDERS
app.get("/api/orders", (req, res) => {

    if (!req.session.isAdmin) {
        return res.status(401).json({
            status: false,
            message: "Unauthorized."
        });
    }

    try {
        let orders = [];

        if (fs.existsSync("orders.json")) {
            const file = fs.readFileSync("orders.json", "utf8");

            if (file.trim()) {
                orders = JSON.parse(file);
            }
        }

        res.json({
            status: true,
            orders: orders
        });

    } catch (error) {
        console.error("Error loading orders:", error);

        res.status(500).json({
            status: false,
            message: "Could not load orders."
        });
    }
});

// UPDATE ORDER STATUS
app.put("/api/orders/:id/status", (req, res) => {

    if (!req.session.isAdmin) {
        return res.status(401).json({
            status: false,
            message: "Unauthorized."
        });
    }

    try {
        const orderId = Number(req.params.id);
        const newStatus = req.body.status;

        const allowedStatuses = [
            "Pending",
            "Processing",
            "Shipped",
            "Delivered",
            "Cancelled"
        ];

        if (!allowedStatuses.includes(newStatus)) {
            return res.status(400).json({
                status: false,
                message: "Invalid order status."
            });
        }

        let orders = [];

        if (fs.existsSync("orders.json")) {
            const file = fs.readFileSync("orders.json", "utf8");

            if (file.trim()) {
                orders = JSON.parse(file);
            }
        }

        const order = orders.find(order => order.id === orderId);

        if (!order) {
            return res.status(404).json({
                status: false,
                message: "Order not found."
            });
        }

        order.orderStatus = newStatus;

        fs.writeFileSync(
            "orders.json",
            JSON.stringify(orders, null, 2)
        );

        res.json({
            status: true,
            message: "Order status updated successfully."
        });

    } catch (error) {
        console.error("Order status update error:", error);

        res.status(500).json({
            status: false,
            message: "Could not update order status."
        });
    }
});

// HOME
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

console.log("ADMIN LOGIN ROUTE LOADED");


const PORT = 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`VANTA server running on port ${PORT}`);
});