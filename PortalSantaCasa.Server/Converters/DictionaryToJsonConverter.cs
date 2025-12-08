using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using System.Text.Json;

namespace PortalSantaCasa.Server.Converters
{
    public class DictionaryToJsonConverter : ValueConverter<Dictionary<string, object>, string>
    {
        public DictionaryToJsonConverter() : base(
            // Função para converter de Model (Dictionary) para Provider (string)
            v => JsonSerializer.Serialize(v, (JsonSerializerOptions)null),
            // Função para converter de Provider (string) para Model (Dictionary)
            v => JsonSerializer.Deserialize<Dictionary<string, object>>(v, (JsonSerializerOptions)null) ?? new Dictionary<string, object>())
        {
        }
    }

}
