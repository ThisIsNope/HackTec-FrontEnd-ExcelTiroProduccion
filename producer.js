function generateQR(event) {
    event.preventDefault();
    const name = document.getElementById('product-name').value;
    document.getElementById('qr-result').innerHTML = `<p>QR Generado para: ${name}</p><img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${name}" alt="QR Code">`;
}

function togglePriceField() {
    const transactionType = document.getElementById('transaction-type').value;
    const priceInput = document.getElementById('price');
    if (transactionType === 'venta') {
        priceInput.style.display = 'block';
        priceInput.required = true;
    } else {
        priceInput.style.display = 'none';
        priceInput.required = false;
        priceInput.value = '';
    }
}