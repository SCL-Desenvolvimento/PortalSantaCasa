using System.ComponentModel.DataAnnotations;

namespace PortalSantaCasa.Server.Security;

public sealed class HttpUrlAttribute : ValidationAttribute
{
    public HttpUrlAttribute() => ErrorMessage = "Informe um endereço HTTP ou HTTPS válido.";
    public override bool IsValid(object? value) => value is null || value is string text &&
        (string.IsNullOrWhiteSpace(text) || Uri.TryCreate(text, UriKind.Absolute, out var uri) &&
            (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp) &&
            string.IsNullOrEmpty(uri.UserInfo));
}
