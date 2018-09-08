
module.exports = async function(response, { inpu, i18n }) {

    if (response.error) {
        response.output = response.error || i18n('otherError');
        console.error(response.error);
    }

    return response;
}

