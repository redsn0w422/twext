$(document).ready(function(){
  $("#submit").click(function(){
    $.post( "/signup", {number: $("#phone").val()} );
    alert("Thanks! Check your phone for the next step.");
    $("#form").toggle();
  });
});
