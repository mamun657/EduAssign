namespace EduAssignPro.Domain.Common;

[AttributeUsage(AttributeTargets.Class, AllowMultiple = false)]
public sealed class BsonCollectionAttribute : Attribute
{
    public string CollectionName { get; }

    public BsonCollectionAttribute(string collectionName)
    {
        CollectionName = collectionName;
    }
}