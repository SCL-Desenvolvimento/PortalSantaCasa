using System.Text.Json;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace PortalSantaCasa.Server.Converters
{

    public class StringArrayToJsonConverter : ValueConverter<string[], string>
    {
        public StringArrayToJsonConverter() : base(
            // Função para converter de Model (string[]) para Provider (string)
            v => JsonSerializer.Serialize(v, (JsonSerializerOptions)null),
            // Função para converter de Provider (string) para Model (string[])
            v => JsonSerializer.Deserialize<string[]>(v, (JsonSerializerOptions)null) ?? new string[0])
        {
        }
    }

}
