from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:    int
    name:  str
    slug:  str
    icon:  Optional[str] = None
    color: Optional[str] = None


class AisleMapOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:          int
    aisle_code:  str
    aisle_name:  str
    x_position:  Decimal
    y_position:  Decimal
    width:       Decimal
    height:      Decimal
    description: Optional[str] = None


class ProductBase(BaseModel):
    sku:                      str
    barcode:                  Optional[str] = None
    name:                     str
    description:              Optional[str] = None
    category_id:              Optional[int] = None
    price:                    Decimal
    weight_grams:             Optional[Decimal] = None
    weight_tolerance_percent: Optional[Decimal] = None
    image_url:                Optional[str] = None
    yolo_class_name:          Optional[str] = None
    aisle_id:                 Optional[int] = None
    shelf_position:           Optional[str] = None
    stock_quantity:           int = 0
    is_active:                bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name:                     Optional[str] = None
    description:              Optional[str] = None
    price:                    Optional[Decimal] = None
    weight_grams:             Optional[Decimal] = None
    weight_tolerance_percent: Optional[Decimal] = None
    image_url:                Optional[str] = None
    stock_quantity:           Optional[int] = None
    is_active:                Optional[bool] = None
    aisle_id:                 Optional[int] = None
    shelf_position:           Optional[str] = None


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id:       int
    category: Optional[CategoryOut] = None
    aisle:    Optional[AisleMapOut] = None


class ProductLookupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:               int
    sku:              str
    barcode:          Optional[str]
    name:             str
    price:            Decimal
    weight_grams:     Optional[Decimal]
    image_url:        Optional[str]
    category:         Optional[CategoryOut]
    aisle:            Optional[AisleMapOut]
    shelf_position:   Optional[str]
