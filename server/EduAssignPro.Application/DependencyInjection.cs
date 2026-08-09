using EduAssignPro.Application.Services;
using Microsoft.Extensions.DependencyInjection;
using System.Reflection;

namespace EduAssignPro.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();
        var serviceTypes = assembly.GetTypes()
            .Where(t => t.IsClass && !t.IsAbstract && t.Name.EndsWith("Service"))
            .ToList();

        foreach (var impl in serviceTypes)
        {
            // Find an interface in the same namespace or matching by name (I{ServiceName})
            var iface = impl.GetInterfaces().FirstOrDefault()
                ?? impl.GetInterfaces().FirstOrDefault();
            if (iface != null)
            {
                services.AddScoped(iface, impl);
            }
            else
            {
                services.AddScoped(impl);
            }
        }

        return services;
    }
}