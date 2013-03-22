function genericError(jqXHR, textStatus, errorThrown)
{
    alert("something went wrong...");
    console.log(jqXHR);
    console.log(textStatus);
    console.log(errorThrown);
    console.trace();
}

function format_json(data) {
    ret = JSON.stringify(data);
    ret = ret.replace(/\,"/g, ',<br />"');
    ret = ret.replace(/\,{/g, ',<br />"');
    return ret;
}
