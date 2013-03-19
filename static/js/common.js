function genericError(jqXHR, textStatus, errorThrown)
{
    alert("something went wrong...");
    console.log(jqXHR);
    console.log(textStatus);
    console.log(errorThrown);
    console.trace();
}
