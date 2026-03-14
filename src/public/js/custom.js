$(document).ready(function(){
    $(".menu").click(function(){
        $(".menu span").toggleClass('active');
        $(".row").slideToggle();
    });
});