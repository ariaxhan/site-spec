// GENERATED from packages/core/test/fixtures, do not hand-edit.
// Regenerate: UPDATE_CONFIGS=1 npx vitest run packages/core/test/site-configs.test.ts
// Shape: pure data, pack referenced by id. This is what agents author.
export default {
  "pack": "catering",
  "target": "cloudflare",
  "spec": {
    "specVersion": "0-1-0",
    "pack": {
      "id": "catering",
      "version": "0-1-0"
    },
    "meta": {
      "lang": "en",
      "title": {
        "kind": "copy",
        "value": "Sunny Table Catering — Fresh & Authentic Korean Home Cooking"
      },
      "description": {
        "kind": "copy",
        "value": "Authentic Korean home cooking for your most special moments — no MSG, made fresh daily. Catering, lunch boxes, premium side dishes, and OC & LA delivery."
      }
    },
    "theme": {
      "palette": {
        "background": "#f2f0eb",
        "surface": "#ffffff",
        "text": "rgba(0, 0, 0, 0.87)",
        "textMuted": "rgba(0, 0, 0, 0.58)",
        "primary": "#00754A",
        "primaryText": "#ffffff",
        "accent": "#006241",
        "border": "#e7e7e7",
        "heading": "#006241",
        "bandBackground": "#296249",
        "bandText": "rgba(255, 255, 255, 1)",
        "bandTextMuted": "rgba(255, 255, 255, 0.70)"
      },
      "typography": {
        "headingFamily": "'Manrope', 'Helvetica Neue', Helvetica, Arial, sans-serif",
        "bodyFamily": "'Manrope', 'Helvetica Neue', Helvetica, Arial, sans-serif",
        "accentFamily": "'Kalam', 'Comic Sans MS', cursive",
        "baseSizePx": 16,
        "scaleRatio": 1.25,
        "headingWeight": 600,
        "bodyWeight": 400,
        "trackingEm": -0.01
      },
      "spacing": {
        "unitPx": 8,
        "scale": [
          0,
          0.5,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8
        ]
      },
      "radiusPx": 12,
      "controlRadiusPx": 50,
      "cardShadow": "0 0 .5px rgba(0,0,0,.14), 0 1px 1px rgba(0,0,0,.24)",
      "pressScale": 0.95,
      "fontImportUrl": "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Kalam:wght@400;700&family=Noto+Sans+KR:wght@400;500;700;800&family=Nanum+Pen+Script&display=swap"
    },
    "sections": [
      {
        "id": "topbar-01",
        "type": "topbar",
        "version": "0-1-0",
        "content": {
          "badge": {
            "kind": "copy",
            "value": "NO MSG · MADE FRESH DAILY"
          },
          "phones": [
            {
              "kind": "fact",
              "value": "+1 555 010 0142",
              "source": "business.phone"
            },
            {
              "kind": "fact",
              "value": "+1 555 010 0143",
              "source": "business.phone2"
            }
          ],
          "email": {
            "kind": "fact",
            "value": "hello@sunnytable.example",
            "source": "business.email"
          }
        }
      },
      {
        "id": "nav-01",
        "type": "nav",
        "version": "0-1-0",
        "content": {
          "logo": "logo",
          "logoAlt": {
            "kind": "fact",
            "value": "Sunny Table Catering",
            "source": "business.name"
          },
          "links": [
            {
              "label": {
                "kind": "copy",
                "value": "Catering"
              },
              "labelKo": {
                "kind": "copy",
                "value": "케이터링"
              },
              "href": "#services"
            },
            {
              "label": {
                "kind": "copy",
                "value": "Side Dishes"
              },
              "labelKo": {
                "kind": "copy",
                "value": "반찬"
              },
              "href": "#banchan"
            },
            {
              "label": {
                "kind": "copy",
                "value": "About"
              },
              "labelKo": {
                "kind": "copy",
                "value": "소개"
              },
              "href": "#about"
            },
            {
              "label": {
                "kind": "copy",
                "value": "Contact"
              },
              "labelKo": {
                "kind": "copy",
                "value": "연락처"
              },
              "href": "#contact"
            }
          ],
          "cta": {
            "label": {
              "kind": "copy",
              "value": "Call to order"
            },
            "href": "tel:15550100142"
          }
        }
      },
      {
        "id": "hero-01",
        "type": "hero",
        "version": "0-1-0",
        "content": {
          "eyebrow": {
            "kind": "copy",
            "value": "Fresh · Authentic · No MSG"
          },
          "headline": {
            "kind": "copy",
            "value": "Bringing happiness\nto your table."
          },
          "lede": {
            "kind": "copy",
            "value": "Authentic Korean home cooking for your most special moments — made fresh every day with high-quality ingredients and the warm taste of a home-cooked meal."
          },
          "ledeKo": {
            "kind": "copy",
            "value": "신선한 재료와 정성 가득한 손맛으로 여러분의 소중한 순간을 더욱 특별하게 만들어 드립니다. 건강을 생각하여 인공 조미료를 사용하지 않습니다."
          },
          "badge": {
            "lines": [
              {
                "kind": "copy",
                "value": "NO"
              },
              {
                "kind": "copy",
                "value": "MSG"
              }
            ],
            "caption": {
              "kind": "copy",
              "value": "FRESH DAILY"
            }
          },
          "image": "hero-dish",
          "imageAlt": {
            "kind": "fact",
            "value": "A spread of fresh Korean dishes from Sunny Table Catering",
            "source": "assets.hero"
          },
          "ctas": [
            {
              "label": {
                "kind": "copy",
                "value": "Explore our catering"
              },
              "href": "#services"
            },
            {
              "label": {
                "kind": "copy",
                "value": "Call to order"
              },
              "href": "tel:15550100142",
              "icon": "phone"
            }
          ]
        }
      },
      {
        "id": "trust-01",
        "type": "trust",
        "version": "0-1-0",
        "content": {
          "items": [
            {
              "icon": "leaf",
              "title": {
                "kind": "copy",
                "value": "No MSG, ever"
              },
              "sub": {
                "kind": "copy",
                "value": "무조미료 · 건강한 한식"
              }
            },
            {
              "icon": "clock",
              "title": {
                "kind": "copy",
                "value": "Made fresh daily"
              },
              "sub": {
                "kind": "copy",
                "value": "매일 신선하게 조리"
              }
            },
            {
              "icon": "heart",
              "title": {
                "kind": "copy",
                "value": "Home-cooked taste"
              },
              "sub": {
                "kind": "copy",
                "value": "정성 가득한 집밥"
              }
            },
            {
              "icon": "pin",
              "title": {
                "kind": "copy",
                "value": "OC & LA delivery"
              },
              "sub": {
                "kind": "copy",
                "value": "OC · LA 배달 가능"
              }
            }
          ]
        }
      },
      {
        "id": "services-01",
        "type": "services",
        "version": "0-1-0",
        "content": {
          "eyebrow": {
            "kind": "copy",
            "value": "Our services"
          },
          "heading": {
            "kind": "copy",
            "value": "Everything you need\nto feed the moment"
          },
          "introKo": {
            "kind": "copy",
            "value": "각종 모임, 기업 행사, 파티 등 행사의 성격에 맞춘 최적의 메뉴와 정갈한 반찬, 그리고 편리한 배달·포장 서비스를 제공합니다."
          },
          "items": [
            {
              "image": "svc-catering",
              "title": {
                "kind": "fact",
                "value": "Customized Catering",
                "source": "services.0.name"
              },
              "titleKo": {
                "kind": "fact",
                "value": "맞춤형 케이터링",
                "source": "services.0.nameKo"
              },
              "body": {
                "kind": "copy",
                "value": "Tailored menus for private gatherings, corporate events, and parties — built around the size and spirit of your occasion."
              },
              "bodyKo": {
                "kind": "copy",
                "value": "각종 모임, 기업 행사, 파티 등 행사의 성격에 맞춘 최적의 메뉴를 제공합니다."
              }
            },
            {
              "image": "svc-lunchbox",
              "title": {
                "kind": "fact",
                "value": "Lunch Boxes",
                "source": "services.1.name"
              },
              "titleKo": {
                "kind": "fact",
                "value": "도시락",
                "source": "services.1.nameKo"
              },
              "body": {
                "kind": "copy",
                "value": "Individually packed Korean lunch boxes made with fresh ingredients and a neat, tidy presentation — optimized for large-volume corporate and event orders."
              },
              "bodyKo": {
                "kind": "copy",
                "value": "신선한 식재료로 정갈하게 포장한 한식 도시락. 대량 주문에 최적화되어 행사·기업 단체 주문에 안성맞춤입니다."
              }
            },
            {
              "image": "svc-banchan",
              "title": {
                "kind": "fact",
                "value": "Premium Side Dishes",
                "source": "services.2.name"
              },
              "titleKo": {
                "kind": "fact",
                "value": "프리미엄 반찬",
                "source": "services.2.nameKo"
              },
              "body": {
                "kind": "copy",
                "value": "A wide variety of authentic Korean banchan, freshly made every single day. Clean, balanced, and full of flavor."
              },
              "bodyKo": {
                "kind": "copy",
                "value": "매일 직접 만드는 정갈하고 다양한 한식 반찬을 만나보세요."
              }
            },
            {
              "image": "svc-delivery",
              "title": {
                "kind": "fact",
                "value": "Delivery & To-Go",
                "source": "services.3.name"
              },
              "titleKo": {
                "kind": "fact",
                "value": "배달 및 포장",
                "source": "services.3.nameKo"
              },
              "body": {
                "kind": "copy",
                "value": "Delivery available across the OC & LA areas (please contact us for details). Quick and easy to-go pick-up, too."
              },
              "bodyKo": {
                "kind": "copy",
                "value": "OC 및 LA 지역 배달 서비스를 제공하며, 포장 주문 시 더욱 간편하고 빠르게 픽업하실 수 있습니다."
              }
            }
          ]
        }
      },
      {
        "id": "banchan-01",
        "type": "banchan",
        "version": "0-1-0",
        "content": {
          "eyebrow": {
            "kind": "copy",
            "value": "Freshly made every day"
          },
          "heading": {
            "kind": "copy",
            "value": "Catering"
          },
          "introKo": {
            "kind": "copy",
            "value": "매일 아침 직접 만드는 반찬 — 정갈한 손맛 그대로."
          },
          "items": [
            {
              "image": "bn-1",
              "name": {
                "kind": "fact",
                "value": "Napa Kimchi",
                "source": "menu.banchan.0.name"
              },
              "nameKo": {
                "kind": "fact",
                "value": "배추김치",
                "source": "menu.banchan.0.nameKo"
              }
            },
            {
              "image": "bn-2",
              "name": {
                "kind": "fact",
                "value": "Japchae",
                "source": "menu.banchan.1.name"
              },
              "nameKo": {
                "kind": "fact",
                "value": "잡채",
                "source": "menu.banchan.1.nameKo"
              }
            },
            {
              "image": "bn-3",
              "name": {
                "kind": "fact",
                "value": "Pink Radish Rolls",
                "source": "menu.banchan.2.name"
              },
              "nameKo": {
                "kind": "fact",
                "value": "핑크 무쌈말이",
                "source": "menu.banchan.2.nameKo"
              }
            },
            {
              "image": "bn-4",
              "name": {
                "kind": "fact",
                "value": "Braised Short Ribs",
                "source": "menu.banchan.3.name"
              },
              "nameKo": {
                "kind": "fact",
                "value": "갈비찜",
                "source": "menu.banchan.3.nameKo"
              }
            },
            {
              "image": "bn-5",
              "name": {
                "kind": "fact",
                "value": "Spicy Squid Salad",
                "source": "menu.banchan.4.name"
              },
              "nameKo": {
                "kind": "fact",
                "value": "오징어무침",
                "source": "menu.banchan.4.nameKo"
              }
            },
            {
              "image": "bn-6",
              "name": {
                "kind": "fact",
                "value": "Pan-Fried Meat Patties",
                "source": "menu.banchan.5.name"
              },
              "nameKo": {
                "kind": "fact",
                "value": "동그랑땡 (완자전)",
                "source": "menu.banchan.5.nameKo"
              }
            },
            {
              "image": "bn-7",
              "name": {
                "kind": "fact",
                "value": "Chilled Jellyfish Salad",
                "source": "menu.banchan.6.name"
              },
              "nameKo": {
                "kind": "fact",
                "value": "해파리 냉채",
                "source": "menu.banchan.6.nameKo"
              }
            },
            {
              "image": "bn-8",
              "name": {
                "kind": "fact",
                "value": "Acorn Jelly Salad",
                "source": "menu.banchan.7.name"
              },
              "nameKo": {
                "kind": "fact",
                "value": "도토리묵 무침",
                "source": "menu.banchan.7.nameKo"
              }
            },
            {
              "image": "bn-9",
              "name": {
                "kind": "fact",
                "value": "Three-Color Namul",
                "source": "menu.banchan.8.name"
              },
              "nameKo": {
                "kind": "fact",
                "value": "삼색 나물",
                "source": "menu.banchan.8.nameKo"
              }
            },
            {
              "image": "bn-10",
              "name": {
                "kind": "fact",
                "value": "California Roll",
                "source": "menu.banchan.9.name"
              },
              "nameKo": {
                "kind": "fact",
                "value": "캘리포니아 롤",
                "source": "menu.banchan.9.nameKo"
              }
            },
            {
              "image": "bn-11",
              "name": {
                "kind": "fact",
                "value": "Seasoned Namul",
                "source": "menu.banchan.10.name"
              },
              "nameKo": {
                "kind": "fact",
                "value": "나물무침",
                "source": "menu.banchan.10.nameKo"
              }
            },
            {
              "image": "bn-12",
              "name": {
                "kind": "fact",
                "value": "Stir-Fried Fish Cake",
                "source": "menu.banchan.11.name"
              },
              "nameKo": {
                "kind": "fact",
                "value": "어묵볶음",
                "source": "menu.banchan.11.nameKo"
              }
            }
          ]
        }
      },
      {
        "id": "feature-01",
        "type": "feature",
        "version": "0-1-0",
        "content": {
          "eyebrow": {
            "kind": "copy",
            "value": "Catering for every occasion"
          },
          "heading": {
            "kind": "copy",
            "value": "From office lunches\nto family celebrations."
          },
          "body": {
            "kind": "copy",
            "value": "Tell us about your event and we'll build the menu around it — fresh, generous, and made to your headcount."
          },
          "bodyKo": {
            "kind": "copy",
            "value": "행사의 규모와 성격에 맞춰 정성껏 준비해 드립니다. 인원수에 맞춰 넉넉하게 차려 드려요."
          },
          "image": "feat-catering",
          "imageAlt": {
            "kind": "fact",
            "value": "An event catering table set by Sunny Table Catering",
            "source": "assets.feature"
          },
          "ctas": [
            {
              "label": {
                "kind": "copy",
                "value": "Request a quote"
              },
              "href": "#quote"
            },
            {
              "label": {
                "kind": "copy",
                "value": "Call us"
              },
              "href": "tel:15550100142"
            }
          ]
        }
      },
      {
        "id": "about-01",
        "type": "about",
        "version": "0-1-0",
        "content": {
          "eyebrow": {
            "kind": "copy",
            "value": "Our story"
          },
          "heading": {
            "kind": "copy",
            "value": "Cooked the way\nMom always did."
          },
          "body": {
            "kind": "copy",
            "value": "At Sunny Table Catering, every dish starts with fresh ingredients and the kind of care you only get at home. No MSG, no shortcuts — just honest Korean cooking, prepared fresh each morning and served with love."
          },
          "bodyKo": {
            "kind": "copy",
            "value": "써니테이블은 신선한 재료와 정성 가득한 손맛으로 모든 요리를 준비합니다. 인공 조미료 없이, 매일 아침 정성을 다해 만드는 건강한 집밥을 차려 드립니다."
          },
          "noteEn": {
            "kind": "copy",
            "value": "Don't worry about leftovers — that's the best part."
          },
          "noteKo": {
            "kind": "copy",
            "value": "맛있게 드세요 — 엄마가"
          },
          "image": "about-kitchen",
          "imageAlt": {
            "kind": "fact",
            "value": "Cooking in the Sunny Table Catering kitchen",
            "source": "assets.about"
          }
        }
      },
      {
        "id": "contact-01",
        "type": "contact",
        "version": "0-1-0",
        "content": {
          "eyebrow": {
            "kind": "copy",
            "value": "Get in touch"
          },
          "heading": {
            "kind": "copy",
            "value": "Let's cater your next moment"
          },
          "body": {
            "kind": "copy",
            "value": "Call or email us to plan your event, order side dishes, or arrange delivery and pick-up."
          },
          "bodyKo": {
            "kind": "copy",
            "value": "행사 준비, 반찬 주문, 배달 및 포장 문의는 전화 또는 이메일로 연락 주세요."
          },
          "ctas": [
            {
              "label": {
                "kind": "copy",
                "value": "Request a quote · 견적 문의"
              },
              "href": "#quote"
            },
            {
              "label": {
                "kind": "copy",
                "value": "Call us · 전화"
              },
              "href": "tel:15550100142",
              "icon": "phone"
            }
          ],
          "phones": [
            {
              "kind": "fact",
              "value": "+1 555 010 0142",
              "source": "business.phone"
            },
            {
              "kind": "fact",
              "value": "+1 555 010 0143",
              "source": "business.phone2"
            }
          ],
          "email": {
            "kind": "fact",
            "value": "hello@sunnytable.example",
            "source": "business.email"
          },
          "addressLines": [
            {
              "kind": "fact",
              "value": "128 Garden Ave",
              "source": "business.addressLine1"
            },
            {
              "kind": "fact",
              "value": "Springfield, CA 90000",
              "source": "business.addressLine2"
            }
          ],
          "addressQuery": "128 Garden Ave Springfield CA 90000",
          "areaTitle": {
            "kind": "copy",
            "value": "Orange County"
          },
          "areaSub": {
            "kind": "copy",
            "value": "& Los Angeles"
          }
        }
      },
      {
        "id": "map-01",
        "type": "map",
        "version": "0-1-0",
        "content": {
          "addressQuery": "128 Garden Ave Springfield CA 90000",
          "pinTitle": {
            "kind": "fact",
            "value": "128 Garden Ave",
            "source": "business.addressLine1"
          },
          "pinSub": {
            "kind": "copy",
            "value": "Springfield, CA 90000 · OC & LA"
          }
        }
      },
      {
        "id": "footer-01",
        "type": "footer",
        "version": "0-1-0",
        "content": {
          "logo": "logo-light",
          "logoAlt": {
            "kind": "fact",
            "value": "Sunny Table Catering",
            "source": "business.name"
          },
          "blurb": {
            "kind": "copy",
            "value": "Fresh, authentic Korean home cooking — no MSG, made fresh daily. Bringing happiness to your table."
          },
          "blurbKo": {
            "kind": "copy",
            "value": "맛있는 한식, 건강한 집밥. 써니테이블."
          },
          "cols": [
            {
              "heading": {
                "kind": "copy",
                "value": "Services"
              },
              "items": [
                {
                  "label": {
                    "kind": "copy",
                    "value": "Customized Catering"
                  },
                  "href": "#services"
                },
                {
                  "label": {
                    "kind": "copy",
                    "value": "Premium Side Dishes"
                  },
                  "href": "#banchan"
                },
                {
                  "label": {
                    "kind": "copy",
                    "value": "Delivery & To-Go"
                  },
                  "href": "#services"
                }
              ]
            },
            {
              "heading": {
                "kind": "copy",
                "value": "Contact"
              },
              "items": [
                {
                  "label": {
                    "kind": "copy",
                    "value": "+1 555 010 0142"
                  },
                  "href": "tel:15550100142"
                },
                {
                  "label": {
                    "kind": "copy",
                    "value": "+1 555 010 0143"
                  },
                  "href": "tel:15550100143"
                },
                {
                  "label": {
                    "kind": "copy",
                    "value": "hello@sunnytable.example"
                  },
                  "href": "mailto:hello@sunnytable.example"
                }
              ]
            },
            {
              "heading": {
                "kind": "copy",
                "value": "Service area"
              },
              "items": [
                {
                  "label": {
                    "kind": "copy",
                    "value": "Orange County (OC)"
                  }
                },
                {
                  "label": {
                    "kind": "copy",
                    "value": "Los Angeles (LA)"
                  }
                },
                {
                  "label": {
                    "kind": "copy",
                    "value": "Delivery & pick-up"
                  }
                }
              ]
            }
          ],
          "bottomLeft": {
            "kind": "copy",
            "value": "© 2026 Sunny Table Catering · 써니테이블. Made fresh with love."
          },
          "bottomRight": {
            "kind": "copy",
            "value": "No MSG · Made fresh daily"
          }
        }
      },
      {
        "id": "quote-01",
        "type": "quote",
        "version": "0-1-0",
        "content": {
          "email": {
            "kind": "fact",
            "value": "hello@sunnytable.example",
            "source": "business.email"
          },
          "eyebrow": {
            "kind": "copy",
            "value": "Request a quote · 견적 문의"
          },
          "heading": {
            "kind": "copy",
            "value": "Tell us about your event"
          },
          "sub": {
            "kind": "copy",
            "value": "행사 정보를 남겨 주시면 빠르게 견적을 보내 드립니다."
          }
        }
      }
    ]
  },
  "brief": {
    "business": {
      "name": "Sunny Table Catering",
      "category": "Korean catering",
      "phone": "+1 555 010 0142",
      "phone2": "+1 555 010 0143",
      "email": "hello@sunnytable.example",
      "address": "128 Garden Ave, Springfield, CA 90000",
      "country": "US",
      "addressLine1": "128 Garden Ave",
      "addressLine2": "Springfield, CA 90000"
    },
    "services": [
      {
        "name": "Customized Catering",
        "nameKo": "맞춤형 케이터링"
      },
      {
        "name": "Lunch Boxes",
        "nameKo": "도시락"
      },
      {
        "name": "Premium Side Dishes",
        "nameKo": "프리미엄 반찬"
      },
      {
        "name": "Delivery & To-Go",
        "nameKo": "배달 및 포장"
      }
    ],
    "menu": {
      "banchan": [
        {
          "name": "Napa Kimchi",
          "nameKo": "배추김치"
        },
        {
          "name": "Japchae",
          "nameKo": "잡채"
        },
        {
          "name": "Pink Radish Rolls",
          "nameKo": "핑크 무쌈말이"
        },
        {
          "name": "Braised Short Ribs",
          "nameKo": "갈비찜"
        },
        {
          "name": "Spicy Squid Salad",
          "nameKo": "오징어무침"
        },
        {
          "name": "Pan-Fried Meat Patties",
          "nameKo": "동그랑땡 (완자전)"
        },
        {
          "name": "Chilled Jellyfish Salad",
          "nameKo": "해파리 냉채"
        },
        {
          "name": "Acorn Jelly Salad",
          "nameKo": "도토리묵 무침"
        },
        {
          "name": "Three-Color Namul",
          "nameKo": "삼색 나물"
        },
        {
          "name": "California Roll",
          "nameKo": "캘리포니아 롤"
        },
        {
          "name": "Seasoned Namul",
          "nameKo": "나물무침"
        },
        {
          "name": "Stir-Fried Fish Cake",
          "nameKo": "어묵볶음"
        }
      ]
    },
    "assets": {
      "hero": "A spread of fresh Korean dishes from Sunny Table Catering",
      "feature": "An event catering table set by Sunny Table Catering",
      "about": "Cooking in the Sunny Table Catering kitchen"
    },
    "hours": [],
    "reviews": []
  },
  "site": {
    "baseUrl": "https://sunnytable.example",
    "path": "/",
    "locales": [
      "en"
    ],
    "defaultLocale": "en"
  },
  "foundation": {
    "forms": [
      {
        "id": "quoteForm",
        "intent": "request a catering quote",
        "endpoint": "mailto:hello@sunnytable.example",
        "method": "mailto",
        "fields": [
          {
            "name": "name",
            "type": "text",
            "required": true
          },
          {
            "name": "phone",
            "type": "tel",
            "required": true
          },
          {
            "name": "email",
            "type": "email"
          },
          {
            "name": "date",
            "type": "text"
          },
          {
            "name": "guests",
            "type": "select"
          },
          {
            "name": "occasion",
            "type": "select"
          },
          {
            "name": "notes",
            "type": "textarea"
          }
        ]
      }
    ]
  }
};
