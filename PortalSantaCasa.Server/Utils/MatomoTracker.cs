namespace PortalSantaCasa.Server.Utils
{
    public class MatomoTracker
    {
        private readonly HttpClient _http;
        private readonly string _endpoint;
        private readonly int _siteId;

        public MatomoTracker(HttpClient http, string endpoint, int siteId)
        {
            _http = http;
            _endpoint = endpoint.TrimEnd('/');
            _siteId = siteId;
        }

        public async Task TrackPageViewAsync(string url, string title, string visitorId = null)
        {
            var uri = $"{_endpoint}/matomo.php?idsite={_siteId}&rec=1&url={Uri.EscapeDataString(url)}&action_name={Uri.EscapeDataString(title)}";
            if (!string.IsNullOrEmpty(visitorId)) uri += $"&_id={Uri.EscapeDataString(visitorId)}";
            await _http.GetAsync(uri);
        }

        public async Task TrackEventAsync(string category, string action, string name = null, double? value = null)
        {
            var uri = $"{_endpoint}/matomo.php?idsite={_siteId}&rec=1&e_c={Uri.EscapeDataString(category)}&e_a={Uri.EscapeDataString(action)}";
            if (!string.IsNullOrEmpty(name)) uri += $"&e_n={Uri.EscapeDataString(name)}";
            if (value.HasValue) uri += $"&e_v={value.Value}";
            await _http.GetAsync(uri);
        }
    }

}
