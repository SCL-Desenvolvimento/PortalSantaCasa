using Microsoft.AspNetCore.Mvc.Filters;
using PortalSantaCasa.Server.Utils;

namespace PortalSantaCasa.Server.Security;

public sealed class QueryLimitsFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        var args = context.ActionArguments;
        var sizeName = args.ContainsKey("perPage") ? "perPage" : "pageSize";
        var pageName = args.ContainsKey("currentPage") ? "currentPage" : "page";
        if (args.TryGetValue(sizeName, out var sizeValue) && sizeValue is int size &&
            args.TryGetValue(pageName, out var pageValue) && pageValue is int page)
        {
            var max = context.RouteData.Values["controller"]?.ToString() == "PublicAccessLog" ? 10000 : 500;
            PaginationLimits.Normalize(ref page, ref size, max);
            args[pageName] = page;
            args[sizeName] = size;
        }
        if (args.TryGetValue("skip", out var skip) && skip is int offset) args["skip"] = Math.Clamp(offset, 0, 1_000_000);
        if (args.TryGetValue("take", out var take) && take is int count) args["take"] = Math.Clamp(count, 1, 100);
    }

    public void OnActionExecuted(ActionExecutedContext context) { }
}
