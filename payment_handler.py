#!/usr/bin/env python3
"""
Ai|oS Payment Handler - Square Integration
Processes $99 one-time payments for Ai|oS Premium Lifetime License

Copyright (c) 2025 Joshua Hendricks Cole (DBA: Corporation of Light). All Rights Reserved. PATENT PENDING.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
from square.client import Client
from datetime import datetime

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Square Client Configuration
SQUARE_SANDBOX_MODE = os.getenv('SQUARE_SANDBOX_MODE', 'true').lower() == 'true'
SQUARE_ACCESS_TOKEN = os.getenv('SQUARE_ACCESS_TOKEN', 'YOUR_SQUARE_ACCESS_TOKEN')
SQUARE_LOCATION_ID = os.getenv('SQUARE_LOCATION_ID', 'YOUR_SQUARE_LOCATION_ID')

# Initialize Square client
client = Client(
    access_token=SQUARE_ACCESS_TOKEN,
    environment='sandbox' if SQUARE_SANDBOX_MODE else 'production'
)

# Payment Configuration
PAYMENT_AMOUNT = 9900  # $99.00 in cents
PRODUCT_NAME = 'Ai|oS Premium Lifetime License'

@app.route('/api/process-square-payment', methods=['POST'])
def process_square_payment():
    """Process a Square payment for Ai|oS Premium"""
    try:
        data = request.get_json()

        # Validate request
        if not data.get('nonce'):
            return jsonify({
                'success': False,
                'error': 'Missing payment nonce'
            }), 400

        payment_amount = data.get('amount', PAYMENT_AMOUNT)
        if payment_amount != PAYMENT_AMOUNT:
            return jsonify({
                'success': False,
                'error': f'Invalid amount. Expected {PAYMENT_AMOUNT}'
            }), 400

        # Create payment with Square API
        try:
            result = client.payments.create_payment(
                body={
                    'source_id': data['nonce'],
                    'amount_money': {
                        'amount': payment_amount,
                        'currency': 'USD'
                    },
                    'location_id': SQUARE_LOCATION_ID,
                    'autocomplete': True,
                    'reference_id': f'aios-premium-{datetime.now().timestamp()}',
                    'note': PRODUCT_NAME,
                    'customer_id': data.get('customer_id'),
                    'receipt_number': f'AIOS-{datetime.now().strftime("%Y%m%d%H%M%S")}',
                    'receipt_url': 'https://aios.is/receipt'
                }
            )

            if result.is_success():
                payment = result.result['payment']

                logger.info(f"[Payment Success] Transaction: {payment['id']}, Amount: ${payment_amount/100}")

                return jsonify({
                    'success': True,
                    'payment_id': payment['id'],
                    'receipt_url': payment.get('receipt_url'),
                    'message': 'Payment processed successfully! Your Ai|oS Premium license is now active.'
                }), 200

            elif result.is_client_error():
                logger.warning(f"[Payment Client Error] {result.errors}")
                return jsonify({
                    'success': False,
                    'error': 'Payment declined. Please check your card details and try again.'
                }), 400

            else:
                logger.error(f"[Payment Server Error] {result.errors}")
                return jsonify({
                    'success': False,
                    'error': 'Payment processing error. Please try again later.'
                }), 500

        except Exception as e:
            logger.error(f"[Payment Exception] {str(e)}")
            return jsonify({
                'success': False,
                'error': 'Payment processing failed. Please try again.'
            }), 500

    except Exception as e:
        logger.error(f"[Request Error] {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Invalid request'
        }), 400

@app.route('/api/payment-config', methods=['GET'])
def get_payment_config():
    """Get payment configuration for frontend"""
    return jsonify({
        'amount': PAYMENT_AMOUNT / 100,  # $99.00
        'currency': 'USD',
        'product': PRODUCT_NAME,
        'sandbox_mode': SQUARE_SANDBOX_MODE
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    square_connected = bool(SQUARE_ACCESS_TOKEN != 'YOUR_SQUARE_ACCESS_TOKEN')
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'square_connected': square_connected
    })

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def server_error(e):
    logger.error(f"[Server Error] {str(e)}")
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Check for required environment variables
    if SQUARE_ACCESS_TOKEN == 'YOUR_SQUARE_ACCESS_TOKEN':
        logger.warning('⚠️  SQUARE_ACCESS_TOKEN not set. Payment processing disabled.')
    if SQUARE_LOCATION_ID == 'YOUR_SQUARE_LOCATION_ID':
        logger.warning('⚠️  SQUARE_LOCATION_ID not set. Payment processing disabled.')

    logger.info(f"Starting Ai|oS Payment Handler (Sandbox: {SQUARE_SANDBOX_MODE})")
    app.run(host='0.0.0.0', port=5000, debug=False)
