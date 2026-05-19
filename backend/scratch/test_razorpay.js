const Razorpay = require('razorpay');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET
});

async function testRazorpay() {
  try {
    console.log('Testing Razorpay with Key:', process.env.RAZORPAY_KEY);
    const order = await razorpay.orders.create({
      amount: 100, // 1 INR
      currency: 'INR',
      receipt: 'test_receipt'
    });
    console.log('Order created successfully:', order.id);
  } catch (err) {
    console.error('Razorpay Error:', err);
  }
}

testRazorpay();
