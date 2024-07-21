function redirectToDateSpecificPage() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const dateStr = `${year}-${month}-${day}`;
    const url = `${dateStr}.html`;

    window.location.href = url;
}

window.onload = redirectToDateSpecificPage;
