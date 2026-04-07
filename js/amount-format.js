document.addEventListener("DOMContentLoaded", () => {

    const inputs = document.querySelectorAll(".amount-input");

    inputs.forEach(input => {

        input.addEventListener("input", (e) => {
            let value = e.target.value.replace(/,/g, "");

            // allow only numbers
            if (!/^\d*$/.test(value)) return;

            if (value === "") {
                e.target.value = "";
                return;
            }

            e.target.value = new Intl.NumberFormat("en-IN").format(value);
        });

    });

});