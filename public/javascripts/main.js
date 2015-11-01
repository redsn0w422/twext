$(document).ready(function(){
  $("#submit").click(function(){
    $.post( "/signup", {number: $("#phone").val()} );
  });
});
