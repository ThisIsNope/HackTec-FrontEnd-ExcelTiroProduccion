function toggleCompanyFields() {
            const userType = document.getElementById('user-type').value;
            const companyForm = document.getElementById('info-para-empresa');
            if (userType === 'empresa') {
                companyForm.style.display = 'block';
            } else {
                companyForm.style.display = 'none';
            }
        }